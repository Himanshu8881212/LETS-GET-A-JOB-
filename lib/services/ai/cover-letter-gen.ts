import { completeJson, type FeatureName, type Message } from '@/lib/llm'
import { buildAgentContext, wrapTask } from '@/lib/services/agent/context'
import { addMemory, extractFactsFromProfile } from '@/lib/services/memory'
import { coverLetterDataSchema } from '@/lib/validation/schemas'
import { loadPrompt } from './prompt-loader'
import { safeUserContent } from './escape'
import { validateCoverLetter } from './validators'

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

/** Extract the target company + role name from a JD for validators. */
function sniffTargets(jd: string): { company?: string; role?: string } {
  const company = /company\s*:\s*(.+)/i.exec(jd)?.[1]?.split('\n')[0]?.trim()
  const role = /job\s*title\s*:\s*(.+)/i.exec(jd)?.[1]?.split('\n')[0]?.trim()
  return { company, role }
}

async function runQuill(feature: FeatureName, input: QuillInput): Promise<unknown> {
  try { extractFactsFromProfile(input.profile_text) } catch { /* noop */ }

  const cfg = loadPrompt('cover_letter_gen')

  const taskBody =
    `<job_description>\n${safeUserContent(input.job_description)}\n</job_description>\n` +
    `<resume_data>\n${safeUserContent(serializeProfile(input.profile_text))}\n</resume_data>\n` +
    `<cover_letter_context>\n${safeUserContent(input.cover_letter_text) || 'None provided.'}\n</cover_letter_context>`

  const context = await buildAgentContext({
    query: input.job_description.slice(0, 400),
    wings: ['style', 'cover_letter'],
    attachReferences: true,
    k: 3,
    minSimilarity: 0.6,
    includeWorkspaceSummary: true,
  }).catch(() => '')

  const systemMessages: Message[] = [{ role: 'system', content: cfg.system }]
  if (context) systemMessages.unshift({ role: 'system', content: context })

  const call = async (retryHint?: string) =>
    completeJson(
      feature,
      {
        messages: [
          ...systemMessages,
          { role: 'user', content: wrapTask('generate_cover_letter', taskBody) },
          ...(retryHint ? [{ role: 'user' as const, content: retryHint }] : []),
        ],
        temperature: cfg.model.temperature ?? 0.1,
        maxTokens: cfg.model.maxTokens ?? 5_000,
        timeoutMs: 240_000,
      },
      coverLetterDataSchema,
    )

  let validated = await call()
  const targets = sniffTargets(input.job_description)
  let report = validateCoverLetter(validated, { targetCompany: targets.company, targetRole: targets.role })

  // One retry if the opener is banned or the word count is wildly off —
  // feed the violations back to the model.
  const needRetry = report.violations.some(v =>
    v.code === 'cover_letter.weak_opener' || v.code === 'cover_letter.word_count',
  )
  if (needRetry) {
    const hint =
      'Your previous draft violated these rules:\n' +
      report.violations.map(v => `- [${v.code}] ${v.message}`).join('\n') +
      '\nReturn a corrected JSON cover letter. Keep the word count between 250 and 400 and never start the opening with a banned phrase.'
    try {
      validated = await call(hint)
      report = validateCoverLetter(validated, { targetCompany: targets.company, targetRole: targets.role })
    } catch { /* keep first draft */ }
  }

  addMemory({
    wing: 'cover_letter',
    drawer: feature,
    content: `JD: ${input.job_description.slice(0, 300)}\n\nOUTPUT:\n${JSON.stringify(validated).slice(0, 1500)}`,
    metadata: {
      feature,
      prompt_version: cfg.version,
      validation_errors: report.violations.filter(v => v.severity === 'error').length,
    },
  }).catch(() => {})

  return report.output
}

export async function generateCoverLetter(input: QuillInput): Promise<unknown> {
  return runQuill('generateCoverLetter', input)
}
