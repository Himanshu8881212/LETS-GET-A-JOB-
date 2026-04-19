import { completeJson, type FeatureName, type Message } from '@/lib/llm'
import { QUILL_COVER_LETTER_PROMPT } from './prompts'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory, extractFactsFromProfile } from '@/lib/services/memory'
import { coverLetterDataSchema } from '@/lib/validation/schemas'

export interface QuillInput {
  job_description: string
  profile_text: string | object
  cover_letter_text?: string
}

function serializeProfile(v: string | object): string {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

async function runQuill(feature: FeatureName, input: QuillInput): Promise<unknown> {
  try { extractFactsFromProfile(input.profile_text) } catch { /* noop */ }

  const taskBody =
    `<job_description>\n${input.job_description}\n</job_description>\n` +
    `<resume_data>\n${serializeProfile(input.profile_text)}\n</resume_data>\n` +
    `<cover_letter_context>\n${input.cover_letter_text || 'None provided.'}\n</cover_letter_context>`

  const context = await buildAgentContext({
    query: input.job_description.slice(0, 400),
    wings: ['style', 'cover_letter'],
    attachReferences: true,
    k: 3,
    minSimilarity: 0.6,
    includeWorkspaceSummary: true,
  }).catch(() => '')

  const systemMessages: Message[] = [{ role: 'system', content: QUILL_COVER_LETTER_PROMPT }]
  if (context) systemMessages.unshift({ role: 'system', content: context })

  const validated = await completeJson(
    feature,
    {
      messages: [
        ...systemMessages,
        { role: 'user', content: wrapTask('generate_cover_letter', taskBody) },
      ],
      temperature: 0.25,
      maxTokens: 5_000,
      timeoutMs: 240_000,
    },
    coverLetterDataSchema
  )

  addMemory({
    wing: 'cover_letter',
    drawer: feature,
    content: `JD: ${input.job_description.slice(0, 300)}\n\nOUTPUT:\n${JSON.stringify(validated).slice(0, 1500)}`,
    metadata: { feature },
  }).catch(() => {})

  return validated
}

export async function generateCoverLetter(input: QuillInput): Promise<unknown> {
  return runQuill('generateCoverLetter', input)
}
