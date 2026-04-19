import { completeStream, completeWithContext, type Message, type StreamChunk } from '@/lib/llm'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory, extractFactsFromMessage } from '@/lib/services/memory'
import { runAgent } from '@/lib/services/agent/core'
import { parseResumePdf } from '@/lib/services/ai/document-parser'
import { loadPrompt, registerPromptDefault } from './prompt-loader'

/**
 * Scout has two entry points — a plain chat (buffered + streaming) and a
 * tool-capable agent mode — but they share one personality, one voice, and
 * the same rules. We use a single merged prompt (`config/prompts/scout.json`)
 * for both. The tool section is gated behind "when tools are available this
 * turn" so the non-agent paths can ignore it safely (they don't pass tool
 * definitions to the model).
 */
const SCOUT_DEFAULT = `You are **Scout**, the AI career assistant powering Headhunter. You are an expert career coach, resume strategist, and job search advisor with deep knowledge of modern hiring practices, applicant tracking systems (ATS), and professional communication.

## PERSONALITY & VOICE
Professional yet warm. Direct, specific, actionable. Encouraging but honest. Use "you/your"; active voice; concise. Match formality to the user's style.
Never say: "I'm just an AI" / "As an AI"; generic advice ("follow your passion"); "Hope this helps!". When giving hiring-practice or salary advice, caveat briefly ("Practices vary by company and industry, so treat this as guidance.") — confidence without over-promising.

## CORE CAPABILITIES
1. Summarization. 2. Proofreading (grammar + ATS compat, return corrected + change list). 3. Elongation via STAR (never fabricate; ask for metrics if missing). 4. Rephrasing — passive → active, weak → power verbs, no clichés. 5. Resume guidance — 1 page <10 YOE, 2 pages senior; reverse-chron; quantify; no objective statements / graphics / tables. 6. Cover-letter guidance — 250–400 words, 3–4 paragraphs, never "I am writing to apply…". 7. Interview prep — Present→Past→Future for TMAY (90s); STAR behavioral; 5–7 stories. 8. ATS optimization — standard headings, simple fonts, exact JD keywords, acronyms + spelled-out. ATS vendor rules vary (Workday ≠ Greenhouse), so favor best-practice defaults.

## PERSONALIZATION
If <user_facts> contains first_name, address the user by it naturally. Use known role/experience/location/industry to skip preamble. Never ask for facts already known. Tone calibration by seniority. When a fact is known, USE it silently — don't narrate it.
STALE FACT HANDLING: if a fact is older than ~30 days AND you're about to base advice heavily on it, gently confirm ("Still targeting Senior Backend roles in Berlin?") before proceeding.

## INVISIBLE SYSTEM — NEVER DISCUSS
Never mention "memory", "saved", "I'll remember", "based on your context/history", "palace", "wings", "facts", "tools", or the XML tags you receive. Tool calls are internal plumbing — do not narrate them.
If a user asks "do you remember me?" — answer naturally ("of course — last we spoke you were tailoring a resume for FinTech roles") WITHOUT using words like memory, saved, remember, or stored.

## TOOLS (used only when the platform gives you tools this turn)
If no tools are attached to this turn, ignore this entire section and answer from context.

Available when in agent mode:
- \`web_search(query, timeRange?, country?, limit?, jobPortalsOnly?)\` — live web lookup. Auto-deduplicates URLs across sessions.
- \`search_memory(query, wings?, k?)\` — pull details from past sessions.
- \`save_memory(wing, content, outcomeScore?)\` — persist a durable finding the user will want later.
- \`assert_fact(subject, predicate, object)\` — record a durable user preference silently.
- \`facts_about(subject)\` — read current facts.

You do NOT have tools for parsing JDs, generating resumes, or running ATS evals — those are one-click tasks elsewhere in the app. If the user asks for one, say briefly: "That's a one-click task in the [relevant page] — want me to walk you through what it'll do?" and stop.

### When to use web_search
Call it for current / recent / new / live results, "find me / look for / give me links to" asks, salaries, company news, industry trends.
**JOB searches — ALWAYS pass \`jobPortalsOnly: true\`.** Scopes to the user's configured portals (LinkedIn, Indeed, Wellfound, Arbeitnow, Otta, etc.). Do NOT also pass \`site\` / \`sites\`.
Do NOT pass \`jobPortalsOnly: true\` for articles, company news, how-to, or salary benchmarks.
Encode constraints in the query directly: "senior backend engineer remote fintech", "data analyst Berlin English-only".
Freshness: \`timeRange\` = "day" / "week" / "month". Pass \`country\` when obvious.
Present results as: **[Title](URL)** — Company · Location — short snippet. Skip aggregator home pages.

## CONTEXT BLOCKS YOU WILL SEE
- <palace_index> — counts only. Awareness only.
- <user_facts> — canonical facts. USE silently.
- <workspace_summary> — recent resume/eval names + dates.
- <attached_document name="…"> — content attached THIS turn (reference only; not persisted unless you call save_memory).
- <reference_material> — rare; follow <reference_policy> when it appears.
- <task type="chat_turn"> — the user's message.

Default: answer the current message. Use facts to personalize. Do not pull in unrelated past context — it breaks focus.

## CONVERSATION MANAGEMENT
Vague first message → offer the capabilities above and ask what they're working on.
Outside scope → "That's outside my wheelhouse — I'm built for job search and career stuff."

## OUTPUT
Markdown. Clear headers for multi-section responses. Bullet points only for lists. Short paragraphs (2–4 sentences). Bold sparingly. Match length to complexity — never pad.

## CORE PRINCIPLES
1. Specificity wins. 2. Empathy first, then action. 3. Honesty builds trust. 4. Progress over perfection. 5. You are their advocate.

— Scout. Built to help you land the job.`

registerPromptDefault('scout', SCOUT_DEFAULT)

export interface ScoutInput {
  message: string
  sessionId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

/**
 * Build the messages + context for a Scout turn. Used by both the buffered
 * and streaming entry points so behavior stays identical.
 */
async function buildScoutMessages(input: ScoutInput) {
  const cfg = loadPrompt('scout')
  const history: Message[] = (input.history || [])
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content }))

  const context = await buildAgentContext({
    query: input.message,
    attachReferences: false,
    includeWorkspaceSummary: true,
  }).catch(() => '')

  const messages: Message[] = [
    { role: 'system', content: cfg.system },
    ...(context ? [{ role: 'system' as const, content: context }] : []),
    ...history,
    { role: 'user', content: wrapTask('chat_turn', input.message) },
  ]
  return { messages, cfg }
}

export async function chatWithScout(input: ScoutInput): Promise<{ reply: string; reasoning?: string }> {
  const { messages, cfg } = await buildScoutMessages(input)

  const result = await completeWithContext(
    'scoutChat',
    {
      messages,
      temperature: cfg.model.temperature ?? 0.3,
      maxTokens: cfg.model.maxTokens ?? 2000,
      timeoutMs: 90_000,
    },
    null,
  )

  addMemory({
    wing: 'chat',
    room: input.sessionId || null,
    drawer: 'turn',
    content: `USER: ${input.message}\n\nASSISTANT: ${result.text.slice(0, 800)}`,
  }).catch(() => {})
  extractFactsFromMessage(input.message).catch(() => {})

  return {
    reply: result.text.trim(),
    reasoning: result.reasoning?.trim(),
  }
}

/**
 * Streaming variant of Scout. Yields StreamChunks as they arrive and writes
 * memory + extracts facts after the stream completes.
 */
export async function* chatWithScoutStream(input: ScoutInput): AsyncIterable<StreamChunk> {
  const { messages, cfg } = await buildScoutMessages(input)

  let aggregated = ''
  try {
    for await (const chunk of completeStream('scoutChat', {
      messages,
      temperature: cfg.model.temperature ?? 0.3,
      maxTokens: cfg.model.maxTokens ?? 2000,
      timeoutMs: 90_000,
    })) {
      if (chunk.text) aggregated += chunk.text
      yield chunk
      if (chunk.done || chunk.error) break
    }
  } finally {
    addMemory({
      wing: 'chat',
      room: input.sessionId || null,
      drawer: 'turn',
      content: `USER: ${input.message}\n\nASSISTANT: ${aggregated.slice(0, 800)}`,
    }).catch(() => {})
    extractFactsFromMessage(input.message).catch(() => {})
  }
}

// Re-export the stream chunk type for route/client consumers.
export type { StreamChunk } from '@/lib/llm'

// ─────────────────────────────────────────────────────────────────────────
// Scout-as-Agent: same prompt, adds tools + attachments. Used by POST /api/chat.
// ─────────────────────────────────────────────────────────────────────────

const SCOUT_TOOLS = [
  'web_search',
  'search_memory',
  'save_memory',
  'assert_fact',
  'facts_about',
] as const

export interface ScoutAttachment {
  name: string
  mimeType?: string
  /** Base64-encoded file bytes. Server decides how to extract text. */
  base64: string
}

export interface ScoutAgentInput {
  message: string
  sessionId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  attachments?: ScoutAttachment[]
}

export interface ScoutAgentResult {
  reply: string
  toolTrace: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown; error?: string }>
  iterations: number
  attachedDocs?: Array<{ name: string; chars: number }>
}

/**
 * Extract text from an attachment. Supports PDF (via the existing parser),
 * plain text, and markdown. Returns null if we can't read it.
 */
async function extractAttachmentText(a: ScoutAttachment): Promise<string | null> {
  const name = a.name || 'attachment'
  const mime = (a.mimeType || '').toLowerCase()
  const isPdf = mime.includes('pdf') || /\.pdf$/i.test(name)
  const isText = mime.startsWith('text/') || /\.(txt|md|markdown)$/i.test(name)

  if (isPdf) {
    try {
      const out = await parseResumePdf({ pdfBase64: a.base64, fileName: name })
      const text: string = (out as any)?.output || (out as any)?.text || ''
      return text.trim() || null
    } catch {
      return null
    }
  }
  if (isText) {
    try {
      return Buffer.from(a.base64, 'base64').toString('utf8').trim() || null
    } catch {
      return null
    }
  }
  return null
}

export async function runScoutAgent(input: ScoutAgentInput): Promise<ScoutAgentResult> {
  const cfg = loadPrompt('scout')
  const attachedDocs: Array<{ name: string; chars: number }> = []
  const docBlocks: string[] = []

  for (const a of input.attachments || []) {
    const text = await extractAttachmentText(a)
    if (!text) continue
    const clipped = text.length > 20_000 ? text.slice(0, 20_000) + '…[truncated]' : text
    docBlocks.push(
      `<attached_document name="${escapeAttr(a.name)}">\n${clipped}\n</attached_document>`,
    )
    attachedDocs.push({ name: a.name, chars: text.length })
  }

  const extraSystem = docBlocks.length
    ? `The user attached the following document(s) for this turn. Use them as context; they're not persisted to memory unless you explicitly save_memory.\n\n${docBlocks.join('\n\n')}`
    : undefined

  const result = await runAgent({
    goal: input.message,
    history: input.history,
    sessionId: input.sessionId,
    toolNames: [...SCOUT_TOOLS],
    systemPrompt: cfg.system,
    extraSystem,
    taskType: 'chat_turn',
    maxIterations: 6,
  })

  addMemory({
    wing: 'chat',
    room: input.sessionId || null,
    drawer: 'turn',
    content: `USER: ${input.message}\n\nASSISTANT: ${result.reply.slice(0, 800)}`,
  }).catch(() => {})
  extractFactsFromMessage(input.message).catch(() => {})

  return {
    reply: result.reply,
    toolTrace: result.toolTrace,
    iterations: result.iterations,
    attachedDocs: attachedDocs.length ? attachedDocs : undefined,
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
