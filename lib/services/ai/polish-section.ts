import { completeWithContext } from '@/lib/llm'
import { buildAgentContext } from '@/lib/services/agent/context'
import { addMemory } from '@/lib/services/memory'

/**
 * Per-section polish — takes one chunk of resume or cover-letter text and
 * rewrites it to sound sharper and more professional WITHOUT inventing
 * facts, changing employers/dates/metrics, or exceeding the same rough
 * length. Used by the magic-wand buttons in each builder section.
 */

export type PolishKind =
  | 'resume_summary'
  | 'resume_experience_bullet'
  | 'resume_experience_bullets' // array of bullets, preserves count
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
  /** Optional — tailors polish toward this role. */
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

const SYSTEM_PROMPT = `You are a world-class resume and cover-letter editor. A user will paste one small section (a summary line, a bullet, a paragraph, a short list of bullets) and ask you to polish it.

YOUR JOB
Make the prose sharper, more professional, more persuasive for a hiring manager. Every rewrite must:
1. **Preserve every fact.** Never invent companies, titles, dates, metrics, tools, skills, or achievements that aren't already present.
2. **Lead with a strong action verb.** Cut "responsible for", "helped", "worked on", "assisted with".
3. **Front-load impact.** Outcome → how. Not "I did X and it produced Y." Instead: "Drove Y by doing X."
4. **Keep quantification.** If there's already a number or metric, keep it. If there's a measurable outcome the existing phrasing implies, tighten the phrasing so the number leads.
5. **Match the section's shape.** A bullet stays a bullet (one line, no terminal period unless it runs long). A paragraph stays a paragraph.
6. **Respect length.** The polished version should be within 80–120% of the original's character count. Never add a paragraph.
7. **Keep the user's voice.** No "I am delighted to announce" corporate fluff. Confident, specific, human.
8. **If a <job_description> is attached**, gently weight word choice toward keywords from it — but only if truthful. Don't insert skills the user didn't demonstrate.

CONTEXT BLOCKS (optional, may appear at start of the conversation)
- <palace_index>: counts only — ignore for content.
- <user_facts>: canonical facts about the user (first_name, years_experience, target_role, skills, etc.). Use silently to color word choice — e.g. if first_name="Priya" don't change to "John", if years_experience="6" keep seniority consistent. Never name-drop or announce "I see your profile says...".
- <reference_material>: past high-outcome polish or bullet examples from this user's own work. Treat as STYLE guidance — pacing, verb choice, level of detail — NEVER copy their phrasing word-for-word or pull facts from them into the current section.
- Ignore any reference item whose topic is off from the current content. When in doubt, lean on <content> alone.

HARD RULES
- Return ONLY the rewritten text. No commentary. No preamble. No trailing notes. No markdown fences.
- For multi-bullet sections, return a JSON array of strings, same count as input.
- If the input is already excellent, still return a polished version — tighten a word, cut one filler word. Never return the original unchanged.
- NEVER add em-dashes as filler. NEVER add generic phrases like "results-driven", "dynamic", "passionate", "world-class", "synergy", "orchestrated", "spearheaded" unless they were already in the source.
- NEVER borrow facts (employers, metrics, project names) from <reference_material>. Those belong to past entries, not this one.

SECTION HINTS
- resume_summary: 2–3 sentences. Role + years + specialty + one concrete differentiator.
- resume_experience_bullet: one line, action verb + what + measurable result. Never starts with "Responsible for".
- resume_experience_bullets: JSON array of one-line bullets, same count as input. Keep the order.
- resume_project_description: one short sentence explaining what the project is.
- resume_project_bullets: JSON array of outcome-led bullets.
- resume_education_description: single line (coursework, honors). Only polish if content warrants it.
- cover_letter_opening: the hook. 2–4 sentences. State the role, reference something specific about the company (already in the content), foreshadow your one strongest claim.
- cover_letter_body: 4–6 sentences telling ONE specific story with a quantified result, mapped to the role.
- cover_letter_closing: 2–3 sentences. Brief, confident, invites a conversation. No "Thanks in advance" begging.

When returning a JSON array for the *_bullets kinds, output pure JSON — no code fences.`

export async function polishSection(input: PolishInput): Promise<PolishResult> {
  const parts: string[] = []
  parts.push(`<section_kind>${input.kind}</section_kind>`)
  if (input.context?.targetRole) parts.push(`<target_role>${input.context.targetRole}</target_role>`)
  if (input.context?.companyName) parts.push(`<company>${input.context.companyName}</company>`)
  if (input.context?.jobDescription) {
    parts.push(`<job_description>\n${input.context.jobDescription.slice(0, 3000)}\n</job_description>`)
  }
  parts.push(`<content>\n${input.content}\n</content>`)

  // Inject shared memory so the polish benefits from:
  //   — <user_facts> (name, years of experience, target_role, etc.)
  //   — <reference_material> (past high-outcome style items — "winning bullets"
  //     from the style wing when they're semantically close to this content)
  // Scoped TIGHT: only style + profile wings, k=2, high-similarity threshold,
  // small char budget per item. The <reference_policy> block tells the model
  // to treat them as style guidance only and never copy verbatim.
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

  const res = await completeWithContext(
    'agent',
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: parts.join('\n\n') },
      ],
      temperature: 0.2,
      maxTokens: 2000,
      timeoutMs: 60_000,
    },
    memoryContext
  )

  const text = res.text.trim()

  // Remember the polish quietly — gives the outcome loop something to promote
  // if this polished version ends up in a resume that scores well.
  addMemory({
    wing: isCoverLetter ? 'cover_letter' : 'resume',
    drawer: `polish/${input.kind}`,
    content: `BEFORE: ${input.content.slice(0, 400)}\n\nAFTER: ${text.slice(0, 400)}`,
    metadata: {
      kind: input.kind,
      targetRole: input.context?.targetRole,
      companyName: input.context?.companyName,
    },
  }).catch(() => {})

  return { polished: text }
}
