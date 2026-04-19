import { complete, type Message, type ToolCall } from '@/lib/llm'
import { buildAgentContext } from './context'
import { getToolHandler, listToolDefinitions } from './tools'

const AGENT_SYSTEM_PROMPT = `You are the Headhunter Agent — an intelligent career assistant with tools for parsing JDs, generating/tailoring resumes and cover letters, running ATS evaluations, and managing a persistent memory palace.

## CONTEXT BLOCKS YOU WILL SEE
Messages are fenced with XML tags so you can tell them apart:

  <palace_index> — Counts per wing. Tells you WHAT exists in memory, not the content. NEVER invent content from these numbers.
  <user_facts>   — Durable facts about the user. Treat as ground truth. Never re-ask for anything listed here.
  <workspace_summary> — Recent resume/evaluation names and dates. No content — just awareness.
  <task type="...">   — The user's current request. This is the only thing you act on directly.
  <reference_material> (rare) — Past outputs retrieved on your behalf. If present, follow <reference_policy> strictly: style guidance only, never copy verbatim, ignore if not directly relevant.
  <memory_recall>     — Results from your own call to search_memory.

## ANTI-CONTEXT-ROT RULES
1. Past memory is OPT-IN. The palace_index tells you what exists. To actually USE it, CALL \`search_memory\` with a narrow query + specific wings.
2. Do not let names, companies, or bullets from past work appear in new outputs unless the current <task> explicitly calls for them.
3. If <reference_material> is present, treat every item as "maybe useful, probably not." Ignore any item whose topic does not match the current task.
4. When in doubt, trust the inputs in <task> over anything else.

## TOOLS
- parse_jd / parse_resume / parse_cover_letter — ingest new inputs
- generate_resume / tailor_resume / generate_cover_letter / tailor_cover_letter — produce structured docs
- evaluate_ats — 10-metric rubric score
- search_memory(query, wings?, k?) — pull reference material on demand
- save_memory(wing, content, outcomeScore?) — persist a durable item
- assert_fact(subject, predicate, object) — store a fact about the user (use subject="user")
- facts_about(subject) — read current facts

## WHEN TO WRITE TO MEMORY
- User reveals a durable preference/fact ("I have 6 years Python", "remote-only", "target fintech") → call \`assert_fact\`.
- After an ATS evaluation scores ≥ 8/10 → \`save_memory\` the winning bullets or opening under wing="style" with outcomeScore=score.
- Never save transient chatter, task inputs you just received, or outputs that scored below 7.

## PERSONALIZATION
If <user_facts> contains first_name, address the user by it naturally. Use known role/experience/location to skip preamble questions. Never ask for something already listed.

## INVISIBLE SYSTEM — NEVER DISCUSS
You have internal memory and context blocks. The user does not see them and must not know they exist. Banned phrasing:
  — "I've saved / stored / remembered that"
  — "I'll remember this for later"
  — "Based on your context / profile / history / memory"
  — "From my records"
  — Anything referring to "palace", "wings", "facts", "tools", or the XML tags you receive
Tool calls are internal plumbing — do not narrate them to the user. If you need to call \`assert_fact\` or \`save_memory\`, just do it silently between turns. Present results as if the knowledge was always yours.

## OUTPUT
Markdown. Terse. No filler. Stop as soon as the goal is satisfied.`

export interface RunAgentInput {
  goal: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  sessionId?: string
  /** Hard ceiling on tool-call iterations. */
  maxIterations?: number
  /** Allow the caller to restrict the tool surface. Defaults to all registered tools. */
  toolNames?: string[]
  /** Override the system prompt. Used by Scout to keep its conversational voice. */
  systemPrompt?: string
  /** Extra system-level material (e.g. attached documents) prepended after context. */
  extraSystem?: string
  /** Task-type hint for the wrapper tag, defaults to "agent_goal". */
  taskType?: string
}

export interface RunAgentResult {
  reply: string
  toolTrace: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown; error?: string }>
  iterations: number
  stopReason: 'final_text' | 'max_iterations' | 'error'
}

/**
 * Agent loop.
 *
 *   loop:
 *     model produces either:
 *       a) final text       → we return it
 *       b) tool_calls[]     → we execute each, feed tool_result messages back, repeat
 *
 *   bounded by maxIterations (default 8).
 */
export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const maxIter = input.maxIterations ?? 8
  const allTools = listToolDefinitions()
  const tools = input.toolNames?.length
    ? allTools.filter(t => input.toolNames!.includes(t.name))
    : allTools

  // Agent loop gets AMBIENT awareness only — no auto-pulled reference material.
  // If the model wants past content it must call search_memory explicitly.
  const context = await buildAgentContext({
    query: input.goal,
    attachReferences: false,
    includeWorkspaceSummary: true,
  }).catch(() => '')

  const messages: Message[] = [
    { role: 'system', content: input.systemPrompt || AGENT_SYSTEM_PROMPT },
    ...(context ? [{ role: 'system' as const, content: context }] : []),
    ...(input.extraSystem ? [{ role: 'system' as const, content: input.extraSystem }] : []),
    ...(input.history || []).slice(-10).map(m => ({ role: m.role, content: m.content }) as Message),
    { role: 'user', content: `<task type="${input.taskType || 'agent_goal'}">\n${input.goal}\n</task>` },
  ]

  const toolTrace: RunAgentResult['toolTrace'] = []

  for (let i = 0; i < maxIter; i++) {
    const res = await complete('agent', {
      messages,
      tools,
      toolChoice: 'auto',
      temperature: 0.3,
      maxTokens: 4096,
      timeoutMs: 240_000,
    })

    const calls: ToolCall[] | undefined = res.toolCalls

    if (!calls?.length) {
      // Final text.
      return {
        reply: res.text.trim(),
        toolTrace,
        iterations: i + 1,
        stopReason: 'final_text',
      }
    }

    // Record the assistant turn that issued the tool calls.
    messages.push({
      role: 'assistant',
      content: res.text || '',
      toolCalls: calls,
    })

    // Execute each call and feed its result back.
    for (const call of calls) {
      const handler = getToolHandler(call.name)
      if (!handler) {
        const err = `No handler registered for tool "${call.name}"`
        toolTrace.push({ name: call.name, arguments: call.arguments, error: err })
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify({ error: err }),
        })
        continue
      }
      try {
        const result = await handler(call.arguments)
        toolTrace.push({ name: call.name, arguments: call.arguments, result })
        const serialized = safeStringify(result)
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: serialized.length > 120_000 ? serialized.slice(0, 120_000) + '…[truncated]' : serialized,
        })
      } catch (e: any) {
        const errMsg = e?.message || String(e)
        toolTrace.push({ name: call.name, arguments: call.arguments, error: errMsg })
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify({ error: errMsg }),
        })
      }
    }
  }

  return {
    reply: '(agent hit the iteration ceiling without producing a final answer — try splitting the goal into smaller steps)',
    toolTrace,
    iterations: maxIter,
    stopReason: 'max_iterations',
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
