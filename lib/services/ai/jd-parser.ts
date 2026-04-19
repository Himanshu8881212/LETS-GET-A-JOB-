import { complete } from '@/lib/llm'
import { fetchPageText } from './url-fetch'
import { loadPrompt } from './prompt-loader'
import { safeUserContent, escapeForPrompt } from './escape'
import { looksLikeEnglish } from './validators'

/** Cap JD input so reasoning models don't chew through 50 KB of page chrome. */
const MAX_JD_CHARS = 24_000
/** Generous timeout — reasoning models (Magistral, DeepSeek-R1) can take 60–150 s on long JDs. */
const LLM_TIMEOUT_MS = 240_000

function withContext(tag: string, err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)
  if (/abort|timed out/i.test(msg)) {
    return new Error(
      `${tag} timed out. Reasoning models (Magistral, o1, DeepSeek R1) can be slow on long inputs — ` +
        `try a non-reasoning model (e.g. mistral-large-latest, gpt-4o-mini, claude-haiku) in Settings ` +
        `for faster JD parsing.`,
    )
  }
  return new Error(`${tag}: ${msg}`)
}

function prelude(content: string): { body: string; notes: string[] } {
  const notes: string[] = []
  const truncated = content.length > MAX_JD_CHARS
  const body = truncated ? content.slice(0, MAX_JD_CHARS) : content

  if (truncated) {
    notes.push('Input was truncated at 24 KB — the full posting may not be visible.')
  }
  if (!looksLikeEnglish(body)) {
    notes.push('Source does not appear to be in English. Tailoring works best when JD and resume are in the same language.')
  }
  return { body, notes }
}

async function runParse(userContent: string): Promise<string> {
  const cfg = loadPrompt('jd_parser')
  const result = await complete('parseJd', {
    messages: [
      { role: 'system', content: cfg.system },
      { role: 'user', content: userContent },
    ],
    temperature: cfg.model.temperature ?? 0.1,
    maxTokens: cfg.model.maxTokens ?? 4000,
    timeoutMs: LLM_TIMEOUT_MS,
  })
  return result.text.trim()
}

export async function parseJobDescriptionFromUrl(url: string): Promise<string> {
  const content = await fetchPageText(url)
  const { body, notes } = prelude(content)

  try {
    const out = await runParse(
      `Job posting URL: ${escapeForPrompt(url)}\n\nPre-fetched page content (clean up and restore per the template; work exclusively from what is below):\n\n${safeUserContent(body)}`,
    )
    return notes.length ? `${out}\n\n[Parser notes]\n- ${notes.join('\n- ')}` : out
  } catch (err) {
    throw withContext('JD parser LLM', err)
  }
}

export async function parseJobDescriptionFromText(rawText: string): Promise<string> {
  const { body, notes } = prelude(rawText)

  try {
    const out = await runParse(
      `Pre-fetched page content (clean up and restore per the template; work exclusively from what is below):\n\n${safeUserContent(body)}`,
    )
    return notes.length ? `${out}\n\n[Parser notes]\n- ${notes.join('\n- ')}` : out
  } catch (err) {
    throw withContext('JD parser LLM', err)
  }
}
