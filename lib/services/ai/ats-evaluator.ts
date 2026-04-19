import { completeWithContext, extractJson } from '@/lib/llm'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory } from '@/lib/services/memory'
import { applyOutcomeBoost } from './outcome-loop'
import { loadPrompt } from './prompt-loader'
import { safeUserContent } from './escape'
import { verifyAtsEvidence } from './validators'

export interface AtsEvaluationInput {
  resume_text: string
  cover_letter_text?: string
  job_description: string
}

export async function evaluateAts(input: AtsEvaluationInput): Promise<unknown> {
  const cfg = loadPrompt('ats_evaluator')

  const taskBody =
    `<job_description>\n${safeUserContent(input.job_description)}\n</job_description>\n` +
    `<resume_text>\n${safeUserContent(input.resume_text)}\n</resume_text>\n` +
    `<cover_letter_text>\n${safeUserContent(input.cover_letter_text) || '(empty — candidate did not provide a cover letter)'}\n</cover_letter_text>`

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
        { role: 'system', content: cfg.system },
        { role: 'user', content: wrapTask('evaluate_ats', taskBody) },
      ],
      temperature: cfg.model.temperature ?? 0,
      maxTokens: cfg.model.maxTokens ?? 12_000,
      jsonMode: true,
      timeoutMs: 300_000,
    },
    context,
  )

  const parsed: any = extractJson(result.text)

  // Post-LLM validators:
  // 1. Every quoted evidence string must be a verbatim substring of its
  //    cited source. Fabricated quotes dock the metric's score.
  // 2. Red-flag deductions are applied to match_estimate so they actually
  //    count (prompt used to surface them without action).
  const { atsJson: adjusted } = verifyAtsEvidence(parsed, {
    resume: input.resume_text,
    jd: input.job_description,
    coverLetter: input.cover_letter_text || '',
  })

  addMemory({
    wing: 'ats',
    drawer: 'evaluation',
    content: `JD: ${input.job_description.slice(0, 300)}\n\nRESULT:\n${JSON.stringify(adjusted).slice(0, 1800)}`,
    metadata: {
      length_resume: input.resume_text.length,
      prompt_version: cfg.version,
      match_estimate: adjusted?.overall?.match_estimate,
      fabricated_quotes: adjusted?._validation?.fabricated_quotes ?? 0,
    },
  }).catch(() => {})

  // Close the outcome loop with the POST-ADJUSTMENT score.
  applyOutcomeBoost({
    evalResult: adjusted,
    resumeText: input.resume_text,
    jobDescription: input.job_description,
  }).catch(() => {})

  return adjusted
}
