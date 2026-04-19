import { complete, completeJson, completeWithContext, extractJson, type FeatureName } from '@/lib/llm'
import { FORGE_RESUME_PROMPT } from './prompts'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory, extractFactsFromProfile } from '@/lib/services/memory'
import { resumeDataSchema } from '@/lib/validation/schemas'
import type { Message } from '@/lib/llm'

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

  const taskBody =
    `<job_description>\n${input.job_description}\n</job_description>\n` +
    `<resume_data>\n${serializeProfile(input.profile_text)}\n</resume_data>\n` +
    `<cover_letter>\n${input.cover_letter_text || 'None provided.'}\n</cover_letter>\n` +
    `<generation_mode>${input.generation_mode || 'optimize'}</generation_mode>`

  // Tight scope: only `style` wing (high-outcome past bullets) + the matching
  // feature's own wing. No cross-task leakage.
  const context = await buildAgentContext({
    query: input.job_description.slice(0, 400),
    wings: ['style', 'resume'],
    attachReferences: true,
    k: 3,
    minSimilarity: 0.58,
    includeWorkspaceSummary: true,
  }).catch(() => '')

  const systemMessages: Message[] = [{ role: 'system', content: FORGE_RESUME_PROMPT }]
  if (context) systemMessages.unshift({ role: 'system', content: context })

  const validated = await completeJson(
    feature,
    {
      messages: [
        ...systemMessages,
        { role: 'user', content: wrapTask('generate_resume', taskBody) },
      ],
      temperature: 0.15,
      maxTokens: 10_000,
      timeoutMs: 300_000,
    },
    resumeDataSchema
  )

  addMemory({
    wing: 'resume',
    drawer: feature,
    content: `JD: ${input.job_description.slice(0, 300)}\n\nOUTPUT:\n${JSON.stringify(validated).slice(0, 1500)}`,
    metadata: { feature, generation_mode: input.generation_mode || 'optimize' },
  }).catch(() => {})

  return validated
}

export async function generateResume(input: ForgeInput): Promise<unknown> {
  return runForge('generateResume', { ...input, generation_mode: input.generation_mode || 'tailor' })
}
