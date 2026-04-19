/**
 * MemPalace-style memory facade.
 *
 * The "palace" metaphor:
 *   Wing   — top-level domain (profile, resume, cover_letter, ats, chat, job, style)
 *   Room   — session/application scope (application id, branch name)
 *   Drawer — artifact kind (bullet, opening, keyword, feedback, preference)
 *
 * At boot, `bootIndex()` returns a tiny summary (counts by wing) — this is
 * the "170 tokens" pattern: tell the model what rooms exist without loading
 * any content. Content is retrieved on demand via `recall()`.
 */

export {
  addMemory,
  invalidateMemory,
  setOutcomeScore,
  listMemoryItems,
  getMemoryItem,
  updateMemoryItem,
  deleteMemoryItem,
} from './store'
export type { MemoryItem, AddMemoryInput, UpdateInput, ListOptions } from './store'
export { searchMemory, listRecent, countByWing } from './search'
export type { SearchHit, SearchOptions } from './search'
export { assertFact, retractFact, factsAbout, factsByPredicate, getFact, updateFact, deleteFact } from './facts'
export { extractFactsFromProfile, extractFactsFromMessage } from './extract'
export type { Fact } from './facts'

import { countByWing } from './search'
import { factsAbout } from './facts'

/** Canonical wing names — keep in sync with how services tag writes. */
export const Wings = {
  profile: 'profile',
  resume: 'resume',
  coverLetter: 'cover_letter',
  ats: 'ats',
  chat: 'chat',
  job: 'job',
  style: 'style',
} as const

/**
 * Tiny boot index — roughly 170 tokens when serialized. Goes into the system
 * prompt so the model knows what's available without paying for full recall.
 */
export function bootIndex(): string {
  const counts = countByWing()
  if (!counts.length) return 'MEMORY: empty (no prior sessions).'

  const lines = ['MEMORY INDEX — what you remember about this user:']
  for (const { wing, count } of counts) {
    lines.push(`  ${wing}: ${count}`)
  }
  lines.push("To recall details, the agent should call `search_memory(query, wings?)`.")
  return lines.join('\n')
}

/**
 * Current facts about "user" as a compact bullet list. These are the most
 * important durable signals — injected into every generation call.
 */
export function userFactsBlock(): string {
  const facts = factsAbout('user')
  if (!facts.length) return ''
  const lines = ['KNOWN ABOUT USER:']
  for (const f of facts) {
    lines.push(`  • ${f.predicate}: ${f.object}`)
  }
  return lines.join('\n')
}
