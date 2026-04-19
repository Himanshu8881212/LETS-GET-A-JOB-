/**
 * Post-generation validators for AI outputs. These run AFTER the LLM returns
 * JSON/text and check rules that the prompt asked for but the model might
 * violate — bullet caps, word counts, forbidden openers, etc.
 *
 * Validators never throw. They return a report with `ok: boolean`, a list of
 * `violations`, and the (possibly repaired) output. Callers decide whether
 * to accept, retry, or surface the violations to the UI.
 */

export interface Violation {
  code: string
  severity: 'error' | 'warn' | 'info'
  message: string
  detail?: Record<string, unknown>
}

export interface ValidationReport<T> {
  ok: boolean
  violations: Violation[]
  output: T
}

// ─────────────────────────────────────────────────────────────────────────
// Resume validators
// ─────────────────────────────────────────────────────────────────────────

const WEAK_VERB_PREFIX = /^\s*(responsible for|helped|worked on|assisted with|duties included|in charge of)/i
const METRIC_HINT = /(\d+(\.\d+)?\s*(%|k|m|b|x)?|\$\s*\d|\b\d+(,\d{3})+|\b\d+\s*(users|customers|teams?|engineers?|people|days?|weeks?|months?|years?|hours?|minutes?|seconds?|ms|req\/s|tps|rps|qps|gb|tb|mb|pb))/i

export interface ResumeLike {
  summary?: string
  experiences?: Array<{ bullets?: string[]; title?: string; company?: string }>
  projects?: Array<{ bullets?: string[]; title?: string }>
  _metadata?: Record<string, unknown>
}

export function validateResume(data: any): ValidationReport<ResumeLike> {
  const violations: Violation[] = []
  const exp: any[] = Array.isArray(data?.experiences) ? data.experiences : []
  const proj: any[] = Array.isArray(data?.projects) ? data.projects : []

  exp.forEach((e, i) => {
    const bullets: string[] = Array.isArray(e?.bullets) ? e.bullets : []
    if (bullets.length < 3 || bullets.length > 5) {
      violations.push({
        code: 'resume.experience.bullet_count',
        severity: 'error',
        message: `Experience #${i + 1} (${e?.title || 'untitled'}) has ${bullets.length} bullets. Expected 3–5.`,
      })
    }
    bullets.forEach((b, bi) => {
      if (WEAK_VERB_PREFIX.test(b)) {
        violations.push({
          code: 'resume.bullet.weak_verb',
          severity: 'warn',
          message: `Experience #${i + 1} bullet #${bi + 1} opens with a weak verb: "${b.slice(0, 60)}…"`,
        })
      }
      if (!METRIC_HINT.test(b)) {
        violations.push({
          code: 'resume.bullet.no_metric',
          severity: 'warn',
          message: `Experience #${i + 1} bullet #${bi + 1} has no number/scope indicator.`,
          detail: { quote: b },
        })
      }
    })
  })

  proj.forEach((p, i) => {
    const bullets: string[] = Array.isArray(p?.bullets) ? p.bullets : []
    if (bullets.length !== 3) {
      violations.push({
        code: 'resume.project.bullet_count',
        severity: 'error',
        message: `Project #${i + 1} (${p?.title || 'untitled'}) has ${bullets.length} bullets. Expected exactly 3.`,
      })
    }
    bullets.forEach((b, bi) => {
      if (!METRIC_HINT.test(b)) {
        violations.push({
          code: 'resume.project.bullet.no_metric',
          severity: 'warn',
          message: `Project #${i + 1} bullet #${bi + 1} has no number/scope indicator.`,
          detail: { quote: b },
        })
      }
    })
  })

  // Summary word count: the prompt says 50–80 words.
  if (typeof data?.summary === 'string' && data.summary.trim()) {
    const words = data.summary.trim().split(/\s+/).length
    if (words < 40 || words > 90) {
      violations.push({
        code: 'resume.summary.word_count',
        severity: 'warn',
        message: `Summary is ${words} words. Expected ~50–80.`,
      })
    }
  }

  // Attach validation summary to _metadata so the UI can show it.
  const meta = (data && typeof data === 'object' ? data._metadata || {} : {}) as Record<string, unknown>
  const errors = violations.filter(v => v.severity === 'error').length
  const warnings = violations.filter(v => v.severity === 'warn').length
  meta.validation = { errors, warnings, violations: violations.slice(0, 20) }
  if (data && typeof data === 'object') data._metadata = meta

  return { ok: errors === 0, violations, output: data }
}

// ─────────────────────────────────────────────────────────────────────────
// Cover-letter validators
// ─────────────────────────────────────────────────────────────────────────

// Expanded forbidden-opener list (2026-04-20). Catches generic templated
// openers that collapse recruiter response rates to ~9% (ResumeGo 2024).
const FORBIDDEN_OPENER = /^\s*(i am writing|i'm writing|to whom it may concern|please find attached|my name is|i would like to apply|i am applying|as an experienced|with \d+\s*(\+|plus)?\s*years? of experience|i have always been passionate|i recently came across your posting|dear hiring manager\s*[,.:]?\s*$)/i

export interface CoverLetterLike {
  openingParagraph?: string
  bodyParagraphs?: string[]
  closingParagraph?: string
  recipientInfo?: { company?: string; position?: string }
  _metadata?: Record<string, unknown>
}

/** Map inferred seniority to the allowed word-count band. */
function wordCountBand(seniority: string | undefined): { min: number; max: number; label: string } {
  const s = (seniority || '').toLowerCase()
  if (s === 'junior' || s === 'entry') return { min: 200, max: 300, label: '200-300' }
  if (s === 'senior' || s === 'executive' || s === 'staff' || s === 'principal') {
    return { min: 300, max: 400, label: '300-400' }
  }
  return { min: 275, max: 375, label: '275-375' } // mid default
}

export function validateCoverLetter(
  data: any,
  ctx: { targetCompany?: string; targetRole?: string; seniority?: string } = {},
): ValidationReport<CoverLetterLike> {
  const violations: Violation[] = []
  const opening = String(data?.openingParagraph || '')
  const bodies: string[] = Array.isArray(data?.bodyParagraphs) ? data.bodyParagraphs : []
  const closing = String(data?.closingParagraph || '')
  const full = [opening, ...bodies, closing].join(' ').trim()
  const words = full ? full.split(/\s+/).length : 0

  // Seniority-gated word count. Prefer the model-reported seniority, fall back
  // to context, fall back to mid. Junior 200-300 / mid 275-375 / senior 300-400.
  const seniority =
    (data?._metadata?.seniority_inferred as string | undefined) || ctx.seniority
  const band = wordCountBand(seniority)
  if (words < band.min - 20 || words > band.max + 20) {
    violations.push({
      code: 'cover_letter.word_count',
      severity: words < band.min - 60 || words > band.max + 60 ? 'error' : 'warn',
      message: `Letter is ${words} words. Target ${band.label} for ${seniority || 'mid'}.`,
    })
  }

  if (opening && FORBIDDEN_OPENER.test(opening)) {
    violations.push({
      code: 'cover_letter.weak_opener',
      severity: 'error',
      message: `Opening starts with a banned phrase: "${opening.slice(0, 50)}…". Rewrite with a specific hook.`,
    })
  }

  // Opening should contain at least one number (specific hook) OR a company name reference.
  const mentionsCompany =
    ctx.targetCompany && opening.toLowerCase().includes(ctx.targetCompany.toLowerCase())
  if (opening && !mentionsCompany && !/\d/.test(opening)) {
    violations.push({
      code: 'cover_letter.opener_generic',
      severity: 'warn',
      message: `Opening doesn't reference the company name or a specific metric — may read as generic.`,
    })
  }

  // At least one metric in the body.
  const bodyBlob = bodies.join(' ')
  if (bodies.length && !METRIC_HINT.test(bodyBlob)) {
    violations.push({
      code: 'cover_letter.body.no_metric',
      severity: 'warn',
      message: `Neither body paragraph contains a number. Add at least one quantified result.`,
    })
  }

  const meta = (data && typeof data === 'object' ? data._metadata || {} : {}) as Record<string, unknown>
  meta.validation = {
    word_count: words,
    errors: violations.filter(v => v.severity === 'error').length,
    warnings: violations.filter(v => v.severity === 'warn').length,
    violations: violations.slice(0, 20),
  }
  meta.opener_starts_with_i_am_writing = FORBIDDEN_OPENER.test(opening)
  if (data && typeof data === 'object') data._metadata = meta

  const ok = !violations.some(v => v.severity === 'error')
  return { ok, violations, output: data }
}

// ─────────────────────────────────────────────────────────────────────────
// ATS evidence-quote verifier
// ─────────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Verify that every quote in `evidence[]` actually appears in the cited
 * source (resume/JD/cover_letter). Quotes that don't match are tagged as
 * fabricated; the metric score is docked 2 points per unique fabrication.
 */
export function verifyAtsEvidence(
  atsJson: any,
  sources: { resume: string; jd: string; coverLetter: string },
): { fabrications: Array<{ metric: string; quote: string; source: string }>; atsJson: any } {
  const fabrications: Array<{ metric: string; quote: string; source: string }> = []
  const haystacks: Record<string, string> = {
    resume: norm(sources.resume || ''),
    jd: norm(sources.jd || ''),
    cover_letter: norm(sources.coverLetter || ''),
  }

  const metrics = atsJson?.metrics
  if (metrics && typeof metrics === 'object') {
    for (const [metricName, metric] of Object.entries(metrics as Record<string, any>)) {
      const evidence: any[] = Array.isArray(metric?.evidence) ? metric.evidence : []
      let fabsInThisMetric = 0
      for (const ev of evidence) {
        const q = typeof ev?.quote === 'string' ? ev.quote : ''
        const src = typeof ev?.source === 'string' ? ev.source : 'resume'
        if (!q) continue
        const normQ = norm(q)
        if (normQ.length < 6) continue
        const hay = haystacks[src] || ''
        // Allow a short fuzzy window: substring OR 90%-of-words overlap.
        if (!hay.includes(normQ)) {
          const words = normQ.split(' ').filter(w => w.length > 2)
          const hits = words.filter(w => hay.includes(w)).length
          const overlap = words.length ? hits / words.length : 0
          // Tightened from 0.85 to 0.92 (2026-04-20): previous threshold missed
          // subtle paraphrasing (swap a noun, keep 8 of 10 words) which is the
          // most common fabrication pattern.
          if (overlap < 0.92) {
            fabrications.push({ metric: metricName, quote: q, source: src })
            fabsInThisMetric++
          }
        }
      }
      if (fabsInThisMetric > 0 && typeof metric.score === 'number') {
        metric.score = Math.max(0, metric.score - 2 * Math.min(2, fabsInThisMetric))
        metric.band_label = `${metric.band_label || ''} (adj: ${fabsInThisMetric} fabricated quote${fabsInThisMetric === 1 ? '' : 's'})`
      }
    }
  }

  // Red-flag deductions on match_estimate. Graduated severity 2026-04-20.
  // severity → points: info=0, low=2, medium=5, high=10. Applies uniformly
  // across all red-flag types (gap, short_tenure, overqualification,
  // skill_regression, inconsistency, demotion).
  const SEVERITY_POINTS: Record<string, number> = {
    info: 0,
    low: 2,
    medium: 5,
    high: 10,
  }
  if (atsJson?.overall && typeof atsJson.overall.match_estimate === 'number') {
    const flags: any[] = Array.isArray(atsJson?.red_flags) ? atsJson.red_flags : []
    let deduction = 0
    for (const f of flags) {
      const sev = String(f?.severity || '').toLowerCase()
      deduction += SEVERITY_POINTS[sev] ?? 0
    }
    if (deduction > 0) {
      const before = atsJson.overall.match_estimate
      atsJson.overall.match_estimate = Math.max(0, Math.round(before - deduction))
      atsJson.overall.red_flag_deduction = deduction

      // Re-grade letter.
      const m = atsJson.overall.match_estimate
      atsJson.overall.letter_grade =
        m >= 85 ? 'A' : m >= 70 ? 'B' : m >= 55 ? 'C' : m >= 40 ? 'D' : 'F'
    }
  }

  // Attach the fabrication report so the UI can surface it.
  if (atsJson && typeof atsJson === 'object') {
    atsJson._validation = {
      fabricated_quotes: fabrications.length,
      fabrications: fabrications.slice(0, 10),
    }
  }

  return { fabrications, atsJson }
}

// ─────────────────────────────────────────────────────────────────────────
// Polish-section length check
// ─────────────────────────────────────────────────────────────────────────

export function polishLengthOk(original: string, polished: string): { ok: boolean; ratio: number } {
  const o = original.trim().length
  const p = polished.trim().length
  if (o === 0) return { ok: true, ratio: 1 }
  const ratio = p / o
  // Tightened to 85-110% (was 70-130%) per 2026-04-20 audit — prior window
  // allowed "polished" bullets to bloat 30% longer, diluting impact.
  return { ok: ratio >= 0.85 && ratio <= 1.1, ratio }
}

// ─────────────────────────────────────────────────────────────────────────
// Language + coherence for parsers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Quick English-ish detection. Returns true if >85% of non-whitespace chars
 * are Latin/ASCII and it contains enough common English function words.
 * Good enough to warn users about obviously non-English input without
 * pulling in a full langdetect dependency.
 */
export function looksLikeEnglish(text: string): boolean {
  if (!text || text.length < 40) return true // too short to judge
  const sample = text.slice(0, 4000)
  const nonWs = sample.replace(/\s/g, '')
  if (!nonWs.length) return true
  const ascii = nonWs.replace(/[^\x20-\x7E]/g, '').length
  const asciiRatio = ascii / nonWs.length
  if (asciiRatio < 0.85) return false
  const stopwordHits = (sample.toLowerCase().match(/\b(the|and|with|for|of|to|a|in|on|is|are|was|were|our|your|you|we|this|that|have|has|will|from|as|at|by)\b/g) || []).length
  return stopwordHits >= 3
}

/** Rough "is the extracted PDF text coherent?" check. */
export function extractionLooksCoherent(text: string): boolean {
  if (!text || text.length < 60) return false
  // Alphabetic density — scanned PDFs with bad OCR score low.
  const letters = (text.match(/[A-Za-z]/g) || []).length
  const ratio = letters / text.length
  if (ratio < 0.45) return false
  // Must contain at least one resume/CL signal word.
  return /\b(experience|education|skills?|summary|contact|email|phone|dear|sincerely|regards)\b/i.test(text)
}
