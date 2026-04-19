import { addMemory, searchMemory, setOutcomeScore } from '@/lib/services/memory'

/**
 * Close the outcome loop.
 *
 * When the ATS evaluator scores a resume highly, the system:
 *   1. Extracts the evidence-grounded bullets the rubric surfaced as strongest.
 *   2. Stores each as a NEW style-wing memory item with outcomeScore = score/10.
 *   3. Boosts any EXISTING items whose content was similar enough to have
 *      contributed (same bullet text reused from memory).
 *
 * Net effect: the `style` wing grows with bullets that actually scored well,
 * and gets preferentially surfaced in future generation calls.
 *
 * No-ops silently on low scores, partial results, or transient failures.
 */

interface Args {
  evalResult: any
  resumeText: string
  jobDescription: string
}

const OUTCOME_THRESHOLD = 75 // match_estimate is 0-100
const SIMILARITY_BOOST_THRESHOLD = 0.78

export async function applyOutcomeBoost({ evalResult, resumeText, jobDescription }: Args): Promise<void> {
  const matchEstimate = toNumber(evalResult?.match_estimate ?? evalResult?.overall?.match_estimate)
  if (matchEstimate == null || matchEstimate < OUTCOME_THRESHOLD) return

  const scoreOnTen = Math.min(10, Math.round((matchEstimate / 10) * 10) / 10)

  const winners = collectWinningBullets(evalResult, resumeText)
  if (!winners.length) return

  // Boost any memory items whose content matches a winning bullet.
  for (const bullet of winners) {
    try {
      const hits = await searchMemory({ query: bullet, wings: ['resume', 'style'], k: 3, currentOnly: true })
      for (const h of hits) {
        if (h.similarity >= SIMILARITY_BOOST_THRESHOLD) {
          // Keep the best outcome score seen so far.
          const next = Math.max(h.outcomeScore ?? 0, scoreOnTen)
          setOutcomeScore(h.id, next)
        }
      }
    } catch {
      /* noop */
    }

    // Also record a fresh style entry so the bullet + its score are captured
    // independent of the generation trail.
    try {
      await addMemory({
        wing: 'style',
        drawer: 'winning_bullet',
        content: bullet,
        outcomeScore: scoreOnTen,
        metadata: {
          source: 'ats_eval',
          match_estimate: matchEstimate,
          jd_snippet: jobDescription.slice(0, 120),
        },
      })
    } catch {
      /* noop */
    }
  }
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Pull up to 5 strong bullets from the eval result. Strategy:
 *   1. If the rubric returned structured "evidence" arrays per metric,
 *      use those as the bullet candidates.
 *   2. Fall back to scanning resumeText for lines that start with "•" or "-"
 *      and contain a number — the heuristic for a quantified bullet.
 */
function collectWinningBullets(evalResult: any, resumeText: string): string[] {
  const candidates: string[] = []

  // Prefer evidence explicitly cited by the rubric.
  const scores = evalResult?.scores
  if (scores && typeof scores === 'object') {
    for (const key of Object.keys(scores)) {
      const ev = scores[key]?.evidence_found
      if (Array.isArray(ev)) {
        for (const e of ev) if (typeof e === 'string') candidates.push(e)
      }
    }
  }

  // Fallback: mine the resume for quantified bullets.
  if (!candidates.length) {
    const lines = resumeText.split('\n')
    for (const raw of lines) {
      const line = raw.trim()
      if (line.length < 30 || line.length > 320) continue
      const startsLikeBullet = /^(•|-|\*|\d+\.)\s/.test(line)
      const hasNumber = /\d/.test(line)
      if (startsLikeBullet && hasNumber) candidates.push(line.replace(/^(•|-|\*|\d+\.)\s*/, ''))
    }
  }

  // Dedupe, cap length, cap count.
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of candidates) {
    const t = c.trim().replace(/\s+/g, ' ')
    if (t.length < 30) continue
    const key = t.toLowerCase().slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t.length > 320 ? t.slice(0, 320) : t)
    if (out.length >= 5) break
  }
  return out
}
