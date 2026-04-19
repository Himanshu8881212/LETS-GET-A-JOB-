import { getDatabase } from '@/lib/db'
import type { CompletionRequest, CompletionResponse, FeatureName } from './types'

/**
 * Observability for every `complete()` call. Writes to the `llm_calls`
 * table. Best-effort: any failure is swallowed — telemetry never breaks
 * a real request.
 */

export interface TelemetryRow {
  id: number
  feature: string
  provider: string | null
  model: string | null
  prompt_preview: string | null
  response_preview: string | null
  input_tokens: number | null
  output_tokens: number | null
  elapsed_ms: number | null
  tool_calls_count: number | null
  finish_reason: string | null
  attempt: number | null
  error: string | null
  created_at: string
}

function preview(s: string, max = 600): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max) + '…' : s
}

export function logLlmCall(opts: {
  feature: FeatureName
  req: CompletionRequest
  res?: CompletionResponse
  error?: unknown
  elapsedMs: number
  attempt: number
}) {
  try {
    const db = getDatabase()
    const last = opts.req.messages[opts.req.messages.length - 1]
    const promptPreview = last ? preview(`[${last.role}] ${last.content || ''}`) : null
    const res = opts.res
    const err = opts.error
      ? err_preview(opts.error)
      : null

    db.prepare(`
      INSERT INTO llm_calls
        (feature, provider, model, prompt_preview, response_preview,
         input_tokens, output_tokens, elapsed_ms, tool_calls_count,
         finish_reason, attempt, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      opts.feature,
      res?.provider ?? null,
      res?.model ?? null,
      promptPreview,
      res ? preview(res.text || '') : null,
      res?.usage?.inputTokens ?? null,
      res?.usage?.outputTokens ?? null,
      opts.elapsedMs,
      res?.toolCalls?.length ?? 0,
      res?.finishReason ?? null,
      opts.attempt,
      err
    )
  } catch {
    /* swallow */
  }
}

function err_preview(e: unknown): string {
  if (!e) return ''
  if (e instanceof Error) return preview(e.message)
  return preview(String(e))
}

export interface ListOptions {
  limit?: number
  offset?: number
  feature?: FeatureName
  errorsOnly?: boolean
}

export function listLlmCalls(opts: ListOptions = {}) {
  const db = getDatabase()
  const where: string[] = []
  const params: any[] = []
  if (opts.feature) {
    where.push('feature = ?')
    params.push(opts.feature)
  }
  if (opts.errorsOnly) {
    where.push('error IS NOT NULL')
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(500, opts.limit ?? 50))
  const offset = Math.max(0, opts.offset ?? 0)

  const total = (db.prepare(`SELECT COUNT(*) as c FROM llm_calls ${whereSql}`).get(...params) as { c: number }).c
  const rows = db
    .prepare(`SELECT * FROM llm_calls ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as TelemetryRow[]

  return { total, rows }
}

export function summarize() {
  const db = getDatabase()
  const totals = db
    .prepare(
      `SELECT COUNT(*) as calls,
              SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors,
              ROUND(AVG(elapsed_ms)) as avg_ms,
              SUM(input_tokens) as input_tokens,
              SUM(output_tokens) as output_tokens
       FROM llm_calls
       WHERE created_at > datetime('now', '-24 hours')`
    )
    .get() as {
    calls: number
    errors: number
    avg_ms: number | null
    input_tokens: number | null
    output_tokens: number | null
  }
  const byFeature = db
    .prepare(
      `SELECT feature, COUNT(*) as calls, ROUND(AVG(elapsed_ms)) as avg_ms
       FROM llm_calls
       WHERE created_at > datetime('now', '-24 hours')
       GROUP BY feature
       ORDER BY calls DESC`
    )
    .all() as Array<{ feature: string; calls: number; avg_ms: number | null }>
  return { totals, byFeature }
}
