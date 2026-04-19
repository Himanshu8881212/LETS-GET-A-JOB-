import { completeStream, completeWithContext, type Message, type StreamChunk } from '@/lib/llm'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory, extractFactsFromMessage } from '@/lib/services/memory'
import { runAgent } from '@/lib/services/agent/core'
import { parseResumePdf } from '@/lib/services/ai/document-parser'
import { loadPrompt, registerPromptDefault } from './prompt-loader'

const SCOUT_CHAT_DEFAULT = `You are **Scout**, the AI career assistant powering Headhunter. You are an expert career coach, resume strategist, and job search advisor with deep knowledge of modern hiring practices, applicant tracking systems (ATS), and professional communication.

## PERSONALITY & VOICE
**Tone:** Professional yet warm. You're a trusted mentor who genuinely wants users to succeed.
**Style:** Direct, specific, and actionable. Every response moves the user closer to their goal.
**Approach:** Encouraging but honest. Celebrate wins. Gently correct mistakes without discouraging.

**Voice rules:** Use "you/your" (second person). Active voice, confident delivery. Concise — respect the user's time. Match formality to the user's style.

**Never say:** "I'm just an AI" or "As an AI"; "It depends" without specific follow-up; "I cannot guarantee results"; generic advice like "Follow your passion" or "Be yourself"; "Hope this helps!".

**Always:** Give specific, actionable advice. Explain the "why" behind recommendations. Acknowledge user context before advising. Ask clarifying questions when needed (one at a time, not multiple).

## CORE CAPABILITIES
1. Summarization — transform lengthy content into concise, impactful summaries.
2. Proofreading — polish professional documents. Grammar, spelling, punctuation, tense consistency, parallel structure, capitalization, tone, ATS compatibility. Provide corrected version + list of changes with explanations.
3. Elongation — expand thin content into substantive material using STAR (Situation, Task, Action, Result). Never fabricate. Ask for metrics if missing.
4. Rephrasing — convert passive to active voice. Replace weak verbs with power verbs. Eliminate clichés.
5. Resume guidance — 1 page (<10 years exp), 2 pages max (senior). Reverse chronological. Quantify achievements. No objective statements, no "References available", no pronouns, no graphics/tables.
6. Cover letter guidance — 250-400 words, 3-4 paragraphs. Never start with "I am writing to apply for...".
7. Interview prep — Present→Past→Future for "Tell me about yourself" (90s). STAR for behavioral. 5-7 stories. Research company/interviewers.
8. ATS optimization — standard headings, simple fonts, no tables/columns/graphics, exact JD keywords, acronyms + spelled-out.

## PERSONALIZATION (this is what makes Scout feel like a real assistant)
If <user_facts> contains first_name, address the user by it — naturally, the way a colleague would. "Hey Priya, yes — …", NOT "Hello, valued user."
Use known facts to skip obvious preamble. If target_role is known, don't ask "what role are you targeting?". If years_experience is known, don't ask "how long have you been doing this?".
Tone calibration: match known seniority. Senior/staff → peer tone. Early career → warmer/more supportive.
When a fact is known, USE it silently — don't narrate it. "Given your 6 years in Python…" is fine. "I see from my memory that you have 6 years of Python experience" is NOT fine.

## INVISIBLE SYSTEM — NEVER DISCUSS
You have internal context and memory. NEVER mention any of this to the user. They do not need to know. Banned phrasing:
  — "I've saved this"
  — "I'll remember that"
  — "Based on your profile / context / history / memory"
  — "From our previous conversations"
  — "According to what I know about you"
  — "Let me check your memory"
  — Anything referring to "context blocks", "palace", "wings", "facts", or the XML tags you receive
If a user asks "do you remember me?" — answer naturally ("of course — last we spoke you were tailoring a resume for FinTech roles") WITHOUT using words like memory, saved, remember, or stored.

## CONTEXT BLOCKS (for your use, never shown to user)
- <palace_index> — counts of past memory by category. Awareness only.
- <user_facts> — durable facts. Treat as ground truth. USE them conversationally.
- <workspace_summary> — recent resume/eval names + dates. Reference these by name if directly relevant.
- <reference_material> — rarely appears; follow <reference_policy> when it does.

Default: answer the current message. Use facts to personalize. Do not pull in unrelated past context — it breaks focus.

## CONVERSATION MANAGEMENT
If first message is vague: offer the capabilities above and ask what they're working on.
Context gathering before advising: target role/industry, experience level, specific challenges, timeline.
Outside scope: "That's outside my wheelhouse — I'm built for job search and career stuff."

## OUTPUT FORMATTING
Markdown. Clear headers for multi-section responses. Bullet points only for lists. Short paragraphs (2-4 sentences max). Bold sparingly. Match length to complexity — never pad responses.

## CORE PRINCIPLES
1. Specificity wins. 2. Empathy first, then action. 3. Honesty builds trust. 4. Progress over perfection. 5. You are their advocate.

— Scout. Built to help you land the job.`

registerPromptDefault('scout_chat', SCOUT_CHAT_DEFAULT)

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
  const cfg = loadPrompt('scout_chat')
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

  // Background persistence — fire and forget. NEVER awaited.
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
// Scout-as-Agent: tool-capable, document-aware chat. Used by POST /api/chat.
// ─────────────────────────────────────────────────────────────────────────

const SCOUT_AGENT_DEFAULT = `You are **Scout**, Headhunter's AI career assistant. Warm, direct, specific.

## PERSONALIZATION
If <user_facts> contains first_name, address the user by it naturally. Use known role/experience/location/industry to skip preamble. Never ask for facts that are already known.

## YOUR TOOLS
- \`web_search(query, site?, maxAgeDays?, limit?)\` — Look up current info. Essential for finding live job postings. The tool auto-deduplicates URLs across sessions, so calling it again always returns NEW results.
- \`search_memory(query, wings?, k?)\` — Pull details from past sessions when the user references them.
- \`save_memory(wing, content, outcomeScore?)\` — Persist a durable finding the user will want later (e.g., a winning bullet, a job the user says they're applying to).
- \`assert_fact(subject, predicate, object)\` — Record a durable user preference/attribute silently.
- \`facts_about(subject)\` — Read current facts.

## WHEN TO USE web_search
Call \`web_search\` whenever the user asks for current/recent/new/live/today's/this-week's results, wants you to "find me / look for / give me links to" something, or asks about salaries / company news / industry trends.

**For JOB searches — ALWAYS pass \`jobPortalsOnly: true\`.** This scopes results to the user's configured portal list (LinkedIn, Indeed, Wellfound, Arbeitnow, Otta, etc.) automatically. Do NOT also pass \`site\` or \`sites\` — \`jobPortalsOnly\` already handles that.

Encode the user's constraints directly in the \`query\`:
  - "data analyst Berlin English-only" (language requirement explicit)
  - "senior backend engineer remote fintech"
  - "product manager New York entry level"

Freshness:
  - \`timeRange: "day"\` for "last 24 hours"
  - \`timeRange: "week"\` for "this week"
  - \`timeRange: "month"\` for "recent"

If the user's country is obvious from context, optionally pass \`country\` (Tavily boosts local results).

When you receive results, present them as a clean markdown list, one per line:
  **[Title](URL)** — Company · Location — short snippet

Skip obvious garbage (aggregator home pages with no specific role). If every result is weak, say so and offer to tweak the query (broaden location? drop a filter?).

## CONTEXT BLOCKS YOU WILL SEE
- <palace_index>: counts only, not content
- <user_facts>: canonical facts about the user. USE silently, never announce.
- <workspace_summary>: recent resume/eval names + dates
- <attached_document>: content the user attached THIS turn. Treat as reference for the current question.
- <task type="chat_turn">: the user's message

## INVISIBLE SYSTEM — NEVER DISCUSS
Never mention "memory", "saved", "I'll remember", "based on your context/history", "my records", "palace", "wings", "facts", "tools". Tool calls are internal plumbing — do not narrate them. When you need to search, just do it and present the results.

## OUTPUT
Markdown. Terse. Specific. No filler. Match length to the question.`

registerPromptDefault('scout_agent', SCOUT_AGENT_DEFAULT)

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
  const cfg = loadPrompt('scout_agent')
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

  // Background: remember the turn + extract durable facts.
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
