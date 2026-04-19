/**
 * Silent fact extraction — pull durable facts about the user from inputs
 * we already have, without telling the user or the model.
 *
 * Two paths:
 *   - extractFactsFromProfile  — deterministic, zero-cost. Reads the profile
 *     JSON that the user uploaded and writes name/email/location/links as
 *     facts. Runs every time the user generates/tailors a resume or CL.
 *
 *   - extractFactsFromMessage  — tiny LLM pass over a single chat message.
 *     Runs in the background after Scout replies. Fire-and-forget — never
 *     blocks the response. Captures things like "I'm targeting FinTech" or
 *     "my name is Priya".
 */

import { complete, extractJson } from '@/lib/llm'
import { assertFact } from './facts'

// ─── Deterministic: from profile JSON ──────────────────────────────────────

type Dict = Record<string, any>

function pick(obj: Dict | undefined, ...keys: string[]): string | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** Write durable facts from a profile blob. Never throws. */
export function extractFactsFromProfile(profile: unknown): void {
  if (!profile) return
  const p: Dict = typeof profile === 'string' ? safeJson(profile) : (profile as Dict) || {}
  const personal: Dict = p.personalInfo || p.personal_info || p.personal || {}

  const firstName = pick(personal, 'firstName', 'first_name', 'firstname')
  const lastName = pick(personal, 'lastName', 'last_name', 'lastname')
  const fullName = pick(personal, 'name', 'fullName')
  const email = pick(personal, 'email')
  const phone = pick(personal, 'phone', 'phoneNumber')
  const location = pick(personal, 'location', 'address', 'city')
  const linkedin = pick(personal, 'linkedin', 'linkedIn', 'linkedinUrl')
  const github = pick(personal, 'github', 'githubUrl')
  const website = pick(personal, 'website', 'portfolio')
  const title = pick(personal, 'title', 'headline', 'role')

  // All profile-derived facts write with source='profile' (rank 2). Lower
  // rank than chat (3) or manual (4), so a sample profile cannot overwrite
  // facts the user typed themselves.
  if (firstName) safeAssert('user', 'first_name', firstName, 'profile')
  if (lastName) safeAssert('user', 'last_name', lastName, 'profile')
  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/)
    if (parts[0]) safeAssert('user', 'first_name', parts[0], 'profile')
    if (parts.length > 1) safeAssert('user', 'last_name', parts.slice(1).join(' '), 'profile')
  }
  if (email) safeAssert('user', 'email', email, 'profile')
  if (phone) safeAssert('user', 'phone', phone, 'profile')
  if (location) safeAssert('user', 'location', location, 'profile')
  if (linkedin) safeAssert('user', 'linkedin', linkedin, 'profile')
  if (github) safeAssert('user', 'github', github, 'profile')
  if (website) safeAssert('user', 'website', website, 'profile')
  if (title) safeAssert('user', 'current_title', title, 'profile')

  // Heuristic: derive years of experience from the longest work entry.
  const work: Dict[] = Array.isArray(p.experience) ? p.experience : Array.isArray(p.workExperience) ? p.workExperience : []
  if (work.length) {
    const years = yearsOfExperience(work)
    if (years != null) safeAssert('user', 'years_experience', String(years), 'profile')
  }
}

function safeAssert(
  subject: string,
  predicate: string,
  object: string,
  source: 'chat' | 'profile' | 'inferred' | 'manual'
) {
  try {
    assertFact(subject, predicate, object, { source })
  } catch {
    /* noop — memory is optional */
  }
}

function safeJson(s: string): Dict {
  try {
    return JSON.parse(s) as Dict
  } catch {
    return {}
  }
}

function yearsOfExperience(work: Dict[]): number | null {
  let earliest: number | null = null
  let latest: number | null = null
  const now = new Date().getFullYear()
  for (const w of work) {
    const start = toYear(w.startDate || w.start_date || w.start)
    const end = isPresentish(w.endDate || w.end_date || w.end) ? now : toYear(w.endDate || w.end_date || w.end)
    if (start != null) earliest = earliest == null ? start : Math.min(earliest, start)
    if (end != null) latest = latest == null ? end : Math.max(latest, end)
  }
  if (earliest == null) return null
  const span = (latest ?? now) - earliest
  return span >= 0 && span < 60 ? span : null
}

function toYear(v: unknown): number | null {
  if (!v) return null
  const s = String(v)
  const m = s.match(/(19|20)\d{2}/)
  return m ? Number(m[0]) : null
}

function isPresentish(v: unknown): boolean {
  if (!v) return false
  const s = String(v).toLowerCase()
  return s === 'present' || s === 'current' || s === 'now'
}

// ─── LLM-based: from a single chat message ────────────────────────────────

const EXTRACT_PROMPT = `You are a silent background extractor. Read the user's message and identify any DURABLE facts about them (things that will still be true next month).

Return ONLY a JSON array of {predicate, object} pairs. Empty array if nothing durable.

Good predicates to use:
  first_name, last_name, location, target_role, target_industry,
  current_title, years_experience, skills, relocation_ok, remote_ok,
  preferred_work_style, seniority, visa_status

RULES:
- Only extract if the message explicitly asserts it ("I'm a Senior PM", "call me Anya").
- NEVER invent. If unsure, skip.
- ONE fact per {predicate, object}. Use comma-separated strings only when the predicate is inherently a list (e.g., skills).
- Values are short strings. No prose.

Example input: "Hey, I'm Priya — 5 years in data eng, looking at fintech roles in Berlin."
Example output: [{"predicate":"first_name","object":"Priya"},{"predicate":"years_experience","object":"5"},{"predicate":"current_title","object":"data engineer"},{"predicate":"target_industry","object":"fintech"},{"predicate":"location","object":"Berlin"}]

If nothing durable: []`

interface ExtractedFact {
  predicate: string
  object: string
}

// ─── Hallucination firewall ─────────────────────────────────────────────
// Closed vocabulary. Anything outside this set is rejected silently.
const ALLOWED_PREDICATES = new Set([
  'first_name',
  'last_name',
  'email',
  'phone',
  'location',
  'linkedin',
  'github',
  'website',
  'target_role',
  'target_industry',
  'current_title',
  'years_experience',
  'seniority',
  'skills',
  'remote_ok',
  'relocation_ok',
  'visa_status',
  'preferred_work_style',
  'salary_expectation',
  'notice_period',
])

// If the source sentence contains any of these hedge phrases, we reject the
// whole extraction pass — the user was expressing a wish, not asserting a fact.
const HEDGE_PATTERN =
  /\b(someday|maybe|perhaps|want to|wanted to|hope to|hoping to|planning to|plan to|eventually|considering|thinking about|might|would like|dream|dreaming|aspire|if i could|if only|wish|would love)\b/i

// Obvious junk values to reject post-extraction.
const VALUE_MIN_CHARS = 1
const VALUE_MAX_CHARS = 200

function isValidValue(v: string): boolean {
  if (v.length < VALUE_MIN_CHARS || v.length > VALUE_MAX_CHARS) return false
  // Reject if it reads like a full sentence rather than a fact value.
  if (/^[A-Z][^.!?]*[.!?]$/.test(v) && v.length > 60) return false
  // Reject common "unknown" placeholders.
  if (/^(unknown|n\/a|none|null|undefined|tbd|tba)$/i.test(v.trim())) return false
  return true
}

/**
 * Background fact extraction from a single user message.
 * Hardened against hallucination: closed vocabulary, hedge rejection,
 * value sanity checks. Best-effort; any failure is silently swallowed.
 */
export async function extractFactsFromMessage(message: string): Promise<void> {
  const trimmed = message.trim()
  if (trimmed.length < 8) return

  // Gate #1: if the message is overtly aspirational, don't extract anything.
  // Prevents "I'd love to be CEO someday" → target_role=CEO.
  if (HEDGE_PATTERN.test(trimmed)) return

  try {
    const res = await complete('agent', {
      messages: [
        { role: 'system', content: EXTRACT_PROMPT },
        { role: 'user', content: trimmed },
      ],
      temperature: 0,
      maxTokens: 400,
      jsonMode: true,
      timeoutMs: 30_000,
    })
    const parsed = extractJson<ExtractedFact[] | { facts?: ExtractedFact[] }>(res.text)
    const list = Array.isArray(parsed) ? parsed : parsed?.facts || []
    for (const f of list) {
      if (!f || typeof f.predicate !== 'string' || typeof f.object !== 'string') continue
      const predicate = f.predicate.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 64)
      const object = f.object.trim().slice(0, VALUE_MAX_CHARS)

      // Gate #2: closed vocabulary.
      if (!ALLOWED_PREDICATES.has(predicate)) continue
      // Gate #3: value sanity.
      if (!isValidValue(object)) continue

      // Chat-derived facts beat profile-derived facts on conflict.
      safeAssert('user', predicate, object, 'chat')
    }
  } catch {
    /* silent */
  }
}
