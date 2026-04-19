import type { CompletionRequest, CompletionResponse, FeatureName, LLMProvider, Message, StreamChunk } from './types'
import { getProviderConfig } from './config'
import { OpenAICompatibleProvider } from './providers/openai-compatible'
import { AnthropicProvider } from './providers/anthropic'
import { GoogleProvider } from './providers/google'
import { logLlmCall } from './telemetry'

export type {
  CompletionRequest,
  CompletionResponse,
  Message,
  LLMProvider,
  FeatureName,
  ToolCall,
  ToolDefinition,
  EmbeddingsConfig,
  EmbeddingsKind,
  StreamChunk,
} from './types'

function instantiate(cfg: ReturnType<typeof getProviderConfig>): LLMProvider {
  switch (cfg.kind) {
    case 'openai-compatible': return new OpenAICompatibleProvider(cfg)
    case 'anthropic': return new AnthropicProvider(cfg)
    case 'google': return new GoogleProvider(cfg)
  }
}

export function getProvider(feature: FeatureName = 'agent'): LLMProvider {
  return instantiate(getProviderConfig(feature))
}

// ─────────────────────────────────────────────────────────────────────────
// Retry classification
// ─────────────────────────────────────────────────────────────────────────

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message || ''
  // HTTP status codes surfaced from our providers look like "anthropic 503: ..."
  if (/\b(408|409|425|429|500|502|503|504|520|521|522|524)\b/.test(msg)) return true
  // Network / timeout / abort
  if (/\b(ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|aborted|timeout|network)\b/i.test(msg)) return true
  if (err.name === 'AbortError') return true
  return false
}

const DEFAULT_MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 900

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Run a single completion with built-in:
 *   - telemetry log per attempt
 *   - retry on transient errors (3 attempts, exponential backoff + jitter)
 */
export async function complete(
  feature: FeatureName,
  req: CompletionRequest
): Promise<CompletionResponse> {
  const maxAttempts = DEFAULT_MAX_ATTEMPTS
  let lastErr: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const provider = getProvider(feature)
    const started = Date.now()
    try {
      const res = await provider.complete(req)
      logLlmCall({ feature, req, res, elapsedMs: Date.now() - started, attempt })
      return res
    } catch (err) {
      lastErr = err
      logLlmCall({ feature, req, error: err, elapsedMs: Date.now() - started, attempt })
      if (attempt >= maxAttempts || !isTransientError(err)) break
      const backoff = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 250)
      await sleep(backoff)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/**
 * Stream a completion. Providers that implement native streaming yield chunks
 * as they arrive; providers that don't fall back to a single final chunk.
 * Always emits a final chunk with `done: true` (or `error`).
 */
export async function* completeStream(
  feature: FeatureName,
  req: CompletionRequest
): AsyncIterable<StreamChunk> {
  const provider = getProvider(feature)
  if (typeof provider.completeStream === 'function') {
    let aggText = ''
    let caught: unknown = null
    const started = Date.now()
    try {
      for await (const chunk of provider.completeStream(req)) {
        if (chunk.text) aggText += chunk.text
        if (chunk.error) caught = new Error(chunk.error)
        yield chunk
      }
    } catch (err: any) {
      caught = err
      yield { error: err?.message || String(err), done: true }
    } finally {
      // Always log — whether the consumer broke early, the stream finished,
      // or the provider threw. Generators run this block on .return()/throw.
      logLlmCall({
        feature,
        req,
        res: caught ? undefined : { text: aggText, model: req.model || '', provider: provider.name },
        error: caught || undefined,
        elapsedMs: Date.now() - started,
        attempt: 1,
      })
    }
    return
  }

  // Fallback: buffer the whole response, then emit it as one chunk + done.
  try {
    const res = await complete(feature, req)
    yield { text: res.text }
    yield { usage: res.usage, done: true }
  } catch (err: any) {
    yield { error: err?.message || String(err), done: true }
  }
}

export async function completeWithContext(
  feature: FeatureName,
  req: CompletionRequest,
  context: string | null | undefined
): Promise<CompletionResponse> {
  if (!context || !context.trim()) return complete(feature, req)
  const messages: Message[] = [
    { role: 'system', content: context.trim() },
    ...req.messages,
  ]
  return complete(feature, { ...req, messages })
}

export function extractJson<T = unknown>(text: string): T {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    return JSON.parse(fence[1].trim()) as T
  }
  const first = trimmed.indexOf('{')
  const firstArr = trimmed.indexOf('[')
  const start = first === -1 ? firstArr : firstArr === -1 ? first : Math.min(first, firstArr)
  if (start === -1) throw new Error('No JSON object/array found in completion')
  const candidate = trimmed.slice(start).trim()
  return JSON.parse(candidate) as T
}

// ─────────────────────────────────────────────────────────────────────────
// Fix #4 — Structured output validation against a Zod schema.
// ─────────────────────────────────────────────────────────────────────────

interface ZodLike {
  safeParse(input: unknown): { success: true; data: any } | { success: false; error: any }
}

function issuesOf(zodError: any): Array<{ path: Array<string | number>; message: string }> {
  const arr = Array.isArray(zodError?.issues) ? zodError.issues : []
  return arr.map((i: any) => ({
    path: Array.isArray(i?.path) ? i.path : [],
    message: typeof i?.message === 'string' ? i.message : 'invalid',
  }))
}

/**
 * Request JSON output, parse it, validate against a schema, and auto-repair
 * once with the error list on failure.
 */
export async function completeJson<S extends ZodLike>(
  feature: FeatureName,
  req: CompletionRequest,
  schema: S
): Promise<ReturnType<S['safeParse']> extends { success: true; data: infer D } ? D : unknown> {
  const first = await complete(feature, { ...req, jsonMode: true })
  let parsedFirst: unknown
  try {
    parsedFirst = extractJson(first.text)
  } catch (err) {
    parsedFirst = undefined
  }
  let firstIssues: Array<{ path: Array<string | number>; message: string }>
  if (parsedFirst !== undefined) {
    const check = schema.safeParse(parsedFirst)
    if (check.success) return check.data
    firstIssues = issuesOf(check.error)
  } else {
    firstIssues = [{ path: [] as Array<string | number>, message: 'Response was not valid JSON.' }]
  }

  const issueText = firstIssues
    .slice(0, 10)
    .map(i => `  - ${i.path.join('.') || '(root)'} — ${i.message}`)
    .join('\n')

  const repair = await complete(feature, {
    ...req,
    jsonMode: true,
    messages: [
      ...req.messages,
      { role: 'assistant', content: first.text },
      {
        role: 'user',
        content: `Your previous response failed validation. Fix these issues and return ONLY the corrected JSON object:\n${issueText}`,
      },
    ],
  })
  const parsedRepair = extractJson(repair.text)
  const check = schema.safeParse(parsedRepair)
  if (!check.success) {
    const issues = issuesOf(check.error)
    throw new Error(
      `Schema validation failed after repair. Issues: ${issues
        .slice(0, 5)
        .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ')}`
    )
  }
  return check.data
}
