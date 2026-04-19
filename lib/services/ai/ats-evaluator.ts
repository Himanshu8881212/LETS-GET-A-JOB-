import { completeWithContext, extractJson } from '@/lib/llm'
import { ATS_EVALUATOR_PROMPT } from './prompts'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory } from '@/lib/services/memory'
import { applyOutcomeBoost } from './outcome-loop'

export interface AtsEvaluationInput {
  resume_text: string
  cover_letter_text?: string
  job_description: string
}

export async function evaluateAts(input: AtsEvaluationInput): Promise<unknown> {
  const taskBody =
    `<job_description>\n${input.job_description}\n</job_description>\n` +
    `<resume_text>\n${input.resume_text}\n</resume_text>\n` +
    `<cover_letter_text>\n${input.cover_letter_text || '(empty — candidate did not provide a cover letter)'}\n</cover_letter_text>`

  // Scoring must stay objective — no reference material, only ambient awareness.
  const context = await buildAgentContext({
    query: input.job_description.slice(0, 400),
    attachReferences: false,
    includeWorkspaceSummary: false,
  }).catch(() => '')

  const result = await completeWithContext(
    'evaluateAts',
    {
      messages: [
        { role: 'system', content: ATS_EVALUATOR_PROMPT },
        { role: 'user', content: wrapTask('evaluate_ats', taskBody) },
      ],
      temperature: 0,
      maxTokens: 12000,
      jsonMode: true,
      timeoutMs: 300_000,
    },
    context
  )

  addMemory({
    wing: 'ats',
    drawer: 'evaluation',
    content: `JD: ${input.job_description.slice(0, 300)}\n\nRESULT:\n${result.text.slice(0, 1800)}`,
    metadata: { length_resume: input.resume_text.length },
  }).catch(() => {})

  const parsed: any = extractJson(result.text)

  // Close the outcome loop: when the eval is strong, promote the
  // evidence-grounded bullets to the style wing and boost any existing
  // memory items that contributed. Never throws.
  applyOutcomeBoost({
    evalResult: parsed,
    resumeText: input.resume_text,
    jobDescription: input.job_description,
  }).catch(() => {})

  return parsed
}
