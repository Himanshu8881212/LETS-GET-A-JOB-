import { completeJson, type FeatureName } from '@/lib/llm'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory, extractFactsFromProfile } from '@/lib/services/memory'
import { resumeDataSchema } from '@/lib/validation/schemas'
import type { Message } from '@/lib/llm'
import { loadPrompt, resolveTemperature } from './prompt-loader'
import { safeUserContent } from './escape'
import { validateResume } from './validators'

export interface ForgeInput {
  job_description: string
  profile_text: string | object
  cover_letter_text?: string
  generation_mode?: 'optimize' | 'rewrite' | 'tailor'
}

function serializeProfile(v: string | object): string {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

async function runForge(feature: FeatureName, input: ForgeInput): Promise<unknown> {
  // Silent fact extraction from profile JSON — runs every time; assertFact
  // dedupes so it's safe to re-run.
  try { extractFactsFromProfile(input.profile_text) } catch { /* noop */ }

  const cfg = loadPrompt('resume_gen')
  const mode = input.generation_mode || 'optimize'
  const temperature = resolveTemperature(cfg, mode)

  const taskBody =
    `<job_description>\n${safeUserContent(input.job_description)}\n</job_description>\n` +
    `<resume_data>\n${safeUserContent(serializeProfile(input.profile_text))}\n</resume_data>\n` +
    `<cover_letter>\n${safeUserContent(input.cover_letter_text) || 'None provided.'}\n</cover_letter>\n` +
    `<generation_mode>${mode}</generation_mode>`

  const context = await buildAgentContext({
    query: input.job_description.slice(0, 400),
    wings: ['style', 'resume'],
    attachReferences: true,
    k: 3,
    minSimilarity: 0.58,
    includeWorkspaceSummary: true,
  }).catch(() => '')

  const systemMessages: Message[] = [{ role: 'system', content: cfg.system }]
  if (context) systemMessages.unshift({ role: 'system', content: context })

  const validated = await completeJson(
    feature,
    {
      messages: [
        ...systemMessages,
        { role: 'user', content: wrapTask('generate_resume', taskBody) },
      ],
      temperature,
      maxTokens: cfg.model.maxTokens ?? 10_000,
      timeoutMs: 300_000,
    },
    resumeDataSchema,
  )

  // Post-gen validation — mutates validated._metadata.validation with counts
  // and any violations so the UI can surface them.
  const report = validateResume(validated)

  addMemory({
    wing: 'resume',
    drawer: feature,
    content: `JD: ${input.job_description.slice(0, 300)}\n\nOUTPUT:\n${JSON.stringify(validated).slice(0, 1500)}`,
    metadata: {
      feature,
      generation_mode: mode,
      prompt_version: cfg.version,
      validation_errors: report.violations.filter(v => v.severity === 'error').length,
    },
  }).catch(() => {})

  return report.output
}

export async function generateResume(input: ForgeInput): Promise<unknown> {
  return runForge('generateResume', { ...input, generation_mode: input.generation_mode || 'tailor' })
}
