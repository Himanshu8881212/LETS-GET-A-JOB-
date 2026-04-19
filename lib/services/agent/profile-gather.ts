/**
 * Assemble a best-effort candidate profile from what Headhunter already
 * knows about the user. Used by Scout's `generate_resume` /
 * `generate_cover_letter` tools so the user can say "make me a resume"
 * without first pasting their entire career history.
 *
 * Priority order:
 *   1. The user's most recent saved resume (full ResumeData JSON) — that's
 *      the richest, most structured view we have.
 *   2. User facts in the memory palace (first_name, years_experience,
 *      target_role, skills, etc.) — overlay on top to catch anything
 *      newer than the saved resume.
 *
 * If neither is available, we return `{ profile_text: '', isEmpty: true,
 * reason: '…' }` so the caller can refuse the generation with a clear
 * explanation instead of producing a fabricated resume.
 */
import { getAllResumeVersions } from '@/lib/services/document-service'
import { factsAbout } from '@/lib/services/memory'

export interface GatheredProfile {
  profile_text: string
  isEmpty: boolean
  reason?: string
  /** Which sources contributed (for telemetry + user messaging). */
  sources: string[]
  /** The most recent saved cover letter text (plain), if any — passed to
   *  generators as `cover_letter_text` for style/voice reference. */
  last_cover_letter?: string
}

export function gatherProfileForUser(userId: number): GatheredProfile {
  const sources: string[] = []
  const parts: string[] = []

  // 1. Latest saved resume.
  let latestResumeData: unknown = null
  try {
    const versions = getAllResumeVersions(userId)
    if (versions.length > 0) {
      const latest = versions[0]
      try {
        latestResumeData = JSON.parse(latest.data_json)
        sources.push(`resume:${latest.version_name}`)
      } catch { /* fall through */ }
    }
  } catch { /* noop */ }

  if (latestResumeData) {
    parts.push('# SAVED RESUME (most recent)\n' + JSON.stringify(latestResumeData, null, 2))
  }

  // 2. Memory facts about 'user'. Render as "key: value" lines.
  try {
    const facts = factsAbout('user')
    if (facts && facts.length > 0) {
      const lines = facts
        .map(f => `- ${f.predicate}: ${f.object}`)
        .join('\n')
      parts.push('# KNOWN FACTS (from memory)\n' + lines)
      sources.push(`memory:${facts.length}_facts`)
    }
  } catch { /* noop */ }

  if (parts.length === 0) {
    return {
      profile_text: '',
      isEmpty: true,
      reason:
        'No saved resume and no user facts in memory. Upload your existing resume (Resumes page → New / Import) or paste its text into the chat so I have something to work from — I will never fabricate experience you don\'t have.',
      sources,
    }
  }

  return {
    profile_text: parts.join('\n\n'),
    isEmpty: false,
    sources,
  }
}
