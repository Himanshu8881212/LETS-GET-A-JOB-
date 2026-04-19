import { completeWithContext } from '@/lib/llm'
import { buildAgentContext } from '@/lib/services/agent/context'
import { addMemory } from '@/lib/services/memory'
import { loadPrompt, registerPromptDefault } from './prompt-loader'
import { safeUserContent } from './escape'
import { polishLengthOk } from './validators'

/**
 * Per-section polish — takes one chunk of resume or cover-letter text and
 * rewrites it to sound sharper and more professional WITHOUT inventing
 * facts, changing employers/dates/metrics, or exceeding the same rough
 * length. Used by the magic-wand buttons in each builder section.
 */

export type PolishKind =
  | 'resume_summary'
  | 'resume_experience_bullet'
  | 'resume_experience_bullets'
  | 'resume_project_description'
  | 'resume_project_bullets'
  | 'resume_education_description'
  | 'cover_letter_opening'
  | 'cover_letter_body'
  | 'cover_letter_closing'

export interface PolishInput {
  kind: PolishKind
  /** Current text, OR a JSON-stringified array when kind is "*_bullets". */
  content: string
  context?: {
    jobDescription?: string
    targetRole?: string
    companyName?: string
  }
}

export interface PolishResult {
  polished: string
  notes?: string
}

const DEFAULT_SYSTEM_PROMPT = `You are a world-class resume and cover-letter editor. A user will paste one small section (a summary line, a bullet, a paragraph, a short list of bullets) and ask you to polish it.

Preserve every fact (companies, titles, dates, metrics, tools, skills) verbatim. Lead with a strong action verb. Keep within 80–120% of the original length. Keep the user's voice. If <target_role> is present, favor verbs respected in that field. If a <job_description> is attached, gently weight word choice toward its keywords — but only if truthful.

Return ONLY the rewritten text. For multi-bullet sections, return a JSON array of strings with the same count as the input. No preamble, no commentary, no code fences.`

registerPromptDefault('polish_section', DEFAULT_SYSTEM_PROMPT)

export async function polishSection(input: PolishInput): Promise<PolishResult> {
  const cfg = loadPrompt('polish_section')

  const parts: string[] = []
  parts.push(`<section_kind>${input.kind}</section_kind>`)
  if (input.context?.targetRole) {
    parts.push(`<target_role>${safeUserContent(input.context.targetRole)}</target_role>`)
  }
  if (input.context?.companyName) {
    parts.push(`<company>${safeUserContent(input.context.companyName)}</company>`)
  }
  if (input.context?.jobDescription) {
    parts.push(
      `<job_description>\n${safeUserContent(input.context.jobDescription, 3000)}\n</job_description>`,
    )
  }
  parts.push(`<content>\n${safeUserContent(input.content)}\n</content>`)

  const isCoverLetter = input.kind.startsWith('cover_letter_')
  const searchQuery = [
    input.content,
    input.context?.targetRole,
    input.context?.jobDescription?.slice(0, 200),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 800)

  const memoryContext = await buildAgentContext({
    query: searchQuery,
    wings: isCoverLetter ? ['style', 'cover_letter'] : ['style', 'resume'],
    attachReferences: true,
    k: 2,
    minSimilarity: 0.62,
    includeWorkspaceSummary: false,
  }).catch(() => '')

  const runOnce = async (extra?: string) =>
    completeWithContext(
      'agent',
      {
        messages: [
          { role: 'system', content: cfg.system },
          { role: 'user', content: parts.join('\n\n') },
          ...(extra ? [{ role: 'user' as const, content: extra }] : []),
        ],
        temperature: cfg.model.temperature ?? 0.1,
        maxTokens: cfg.model.maxTokens ?? 2000,
        timeoutMs: 60_000,
      },
      memoryContext,
    )

  let res = await runOnce()
  let text = res.text.trim()

  // Length check for single-string kinds only. For *_bullets the ratio is
  // sum-of-lengths, which we measure too.
  const lenCheck = polishLengthOk(input.content, text)
  if (!lenCheck.ok) {
    const hint =
      `Your draft changed the length too much (ratio ${lenCheck.ratio.toFixed(2)}). ` +
      `Return a version whose character count is within 80–120% of the original. ` +
      `Preserve every fact and metric. Return only the rewritten text.`
    try {
      res = await runOnce(hint)
      text = res.text.trim()
    } catch { /* keep first draft */ }
  }

  addMemory({
    wing: isCoverLetter ? 'cover_letter' : 'resume',
    drawer: `polish/${input.kind}`,
    content: `BEFORE: ${input.content.slice(0, 400)}\n\nAFTER: ${text.slice(0, 400)}`,
    metadata: {
      kind: input.kind,
      targetRole: input.context?.targetRole,
      companyName: input.context?.companyName,
      length_ratio: lenCheck.ratio,
      prompt_version: cfg.version,
    },
  }).catch(() => {})

  return { polished: text }
}
