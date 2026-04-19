import { complete } from '@/lib/llm'
import { fetchPageText } from './url-fetch'
import { JD_PARSER_PROMPT } from './prompts'

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
        `for faster JD parsing.`
    )
  }
  return new Error(`${tag}: ${msg}`)
}

export async function parseJobDescriptionFromUrl(url: string): Promise<string> {
  const content = await fetchPageText(url)
  const trimmed = content.slice(0, MAX_JD_CHARS)

  try {
    const result = await complete('parseJd', {
      messages: [
        { role: 'system', content: JD_PARSER_PROMPT },
        {
          role: 'user',
          content: `Job posting URL: ${url}\n\nPre-fetched page content (clean up and restore per the template; work exclusively from what is below):\n\n${trimmed}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 4000,
      timeoutMs: LLM_TIMEOUT_MS,
    })
    return result.text.trim()
  } catch (err) {
    throw withContext('JD parser LLM', err)
  }
}

export async function parseJobDescriptionFromText(rawText: string): Promise<string> {
  const trimmed = rawText.slice(0, MAX_JD_CHARS)

  try {
    const result = await complete('parseJd', {
      messages: [
        { role: 'system', content: JD_PARSER_PROMPT },
        {
          role: 'user',
          content: `Pre-fetched page content (clean up and restore per the template; work exclusively from what is below):\n\n${trimmed}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 4000,
      timeoutMs: LLM_TIMEOUT_MS,
    })
    return result.text.trim()
  } catch (err) {
    throw withContext('JD parser LLM', err)
  }
}
