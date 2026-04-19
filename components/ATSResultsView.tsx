'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Info,
  MinusCircle,
  Quote,
  Target,
  XCircle,
} from 'lucide-react'
import { Button } from './ui/Button'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EvidenceItem {
  quote?: string
  source?: 'jd' | 'resume' | 'cover_letter' | string
}

interface FixItem {
  action?: string
  why?: string
  example?: string
}

interface BaseMetric {
  score?: number
  weight?: number
  band_label?: string
  summary?: string
  evidence?: EvidenceItem[]
  fixes?: FixItem[]
  [k: string]: any
}

interface EvaluationV2 {
  schema_version?: string
  meta?: {
    target_role?: string
    target_company?: string | null
    seniority_inferred?: 'junior' | 'mid' | 'senior' | 'executive'
  }
  overall?: {
    match_estimate?: number
    letter_grade?: 'A' | 'B' | 'C' | 'D' | 'F'
    verdict?: string
    interview_likelihood?: 'high' | 'medium' | 'low' | 'very-low'
    recommended_action?: 'submit' | 'refine-high-priority' | 'significant-rework'
  }
  knockouts?: {
    risk?: 'none' | 'low' | 'medium' | 'high'
    items?: Array<{
      type?: string
      jd_requirement?: string
      candidate_evidence?: string
      met?: boolean
    }>
  }
  metrics?: Record<string, BaseMetric>
  red_flags?: Array<{
    type?: string
    severity?: 'info' | 'low' | 'medium' | 'high' | string
    evidence?: string
    context_note?: string
    suggested_framing?: string
  }>
  keyword_analysis?: Array<{
    term?: string
    in_jd?: number
    in_resume?: number
    in_cover_letter?: number
    status?: 'matched' | 'missing' | 'partial' | string
    priority?: 'required' | 'preferred' | string
  }>
  top_fixes?: Array<{
    priority?: number
    metric?: string
    action?: string
    why?: string
    estimated_lift?: string
    example?: string
  }>
  chart_data?: {
    radar?: Array<{ metric?: string; score?: number; max?: number }>
    coverage?: { required_skills_pct?: number; preferred_skills_pct?: number }
  }
}

interface Props {
  evaluationResult: any
  summarizedJD?: string
  parsedResume?: string
  parsedCoverLetter?: string
  onNewEvaluation?: () => void
}

/* ------------------------------------------------------------------ */
/*  Metric metadata (order, labels, weights match the prompt)          */
/* ------------------------------------------------------------------ */

const METRIC_ORDER: Array<{
  key: string
  label: string
  weight: number
  blurb: string
}> = [
  { key: 'hard_skills', label: 'Hard Skills', weight: 22, blurb: 'JD required-skill coverage, demonstrated in bullets' },
  { key: 'quantified_impact', label: 'Quantified Impact', weight: 16, blurb: 'Ratio of bullets with credible metrics' },
  { key: 'title_alignment', label: 'Title & Seniority', weight: 10, blurb: 'Alignment to posted title & level' },
  { key: 'cover_letter', label: 'Cover Letter', weight: 10, blurb: 'Tailoring, opener, company research' },
  { key: 'parseability', label: 'ATS Parseability', weight: 10, blurb: 'Format signals for Workday / Taleo / Lever' },
  { key: 'writing_mechanics', label: 'Writing Mechanics', weight: 8, blurb: 'Verbs, voice, clichés, grammar' },
  { key: 'bullet_hygiene', label: 'Bullet Hygiene', weight: 6, blurb: 'Length, structure, count per role' },
  { key: 'soft_skills', label: 'Soft Skills', weight: 6, blurb: 'Demonstration vs assertion' },
  { key: 'recency_progression', label: 'Recency & Progression', weight: 6, blurb: 'Target-relevant work + trajectory' },
  { key: 'education_credentials', label: 'Education & Credentials', weight: 6, blurb: 'Degrees, certs, licenses' },
]

/* ------------------------------------------------------------------ */
/*  Small UI atoms                                                     */
/* ------------------------------------------------------------------ */

function scoreToneClasses(score: number): { bg: string; text: string; ring: string } {
  if (score >= 8) return { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' }
  if (score >= 6) return { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' }
  if (score >= 4) return { bg: 'bg-orange-50', text: 'text-orange-800', ring: 'ring-orange-200' }
  return { bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-200' }
}

function matchEstimateColor(score: number): string {
  if (score >= 85) return 'text-emerald-700'
  if (score >= 70) return 'text-brand-ink'
  if (score >= 55) return 'text-amber-700'
  if (score >= 40) return 'text-orange-700'
  return 'text-red-700'
}

function letterGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-600 text-white'
    case 'B': return 'bg-brand-ink text-white'
    case 'C': return 'bg-amber-500 text-white'
    case 'D': return 'bg-orange-500 text-white'
    case 'F': return 'bg-red-600 text-white'
    default: return 'bg-brand-steel text-white'
  }
}

function likelihoodTone(v: string): { dot: string; text: string; label: string } {
  switch (v) {
    case 'high': return { dot: 'bg-emerald-500', text: 'text-emerald-800', label: 'High' }
    case 'medium': return { dot: 'bg-amber-500', text: 'text-amber-800', label: 'Medium' }
    case 'low': return { dot: 'bg-orange-500', text: 'text-orange-800', label: 'Low' }
    case 'very-low': return { dot: 'bg-red-500', text: 'text-red-800', label: 'Very low' }
    default: return { dot: 'bg-brand-steel', text: 'text-brand-steel', label: v || '—' }
  }
}

function actionTone(v?: string): { cls: string; label: string; icon: React.ReactNode } {
  switch (v) {
    case 'submit':
      return { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Ready to submit', icon: <CheckCircle2 className="w-4 h-4" /> }
    case 'refine-high-priority':
      return { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Refine before applying', icon: <AlertCircle className="w-4 h-4" /> }
    case 'significant-rework':
      return { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Significant rework needed', icon: <XCircle className="w-4 h-4" /> }
    default:
      return { cls: 'bg-brand-mist text-brand-steel border-brand-border', label: v || '—', icon: <Info className="w-4 h-4" /> }
  }
}

function knockoutTone(risk?: string): { cls: string; label: string; icon: React.ReactNode } {
  switch (risk) {
    case 'none':
      return { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'No knockout risks', icon: <CheckCircle2 className="w-4 h-4" /> }
    case 'low':
      return { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Low knockout risk', icon: <AlertCircle className="w-4 h-4" /> }
    case 'medium':
      return { cls: 'bg-orange-50 text-orange-800 border-orange-200', label: 'Medium knockout risk', icon: <AlertTriangle className="w-4 h-4" /> }
    case 'high':
      return { cls: 'bg-red-50 text-red-800 border-red-200', label: 'High knockout risk', icon: <XCircle className="w-4 h-4" /> }
    default:
      return { cls: 'bg-brand-mist text-brand-steel border-brand-border', label: '—', icon: <Info className="w-4 h-4" /> }
  }
}

/* ------------------------------------------------------------------ */
/*  Radar chart (simple inline SVG, no chart library)                  */
/* ------------------------------------------------------------------ */

function RadarChart({ data }: { data: Array<{ metric: string; score: number }> }) {
  if (!data.length) return null
  const size = 320
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 48
  const n = data.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2

  const points = data.map((d, i) => {
    const r = (radius * Math.max(0, Math.min(10, d.score))) / 10
    return { x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) }
  })
  const polygon = points.map(p => `${p.x},${p.y}`).join(' ')

  const axisEnds = data.map((_, i) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i)),
  }))

  const labels = data.map((d, i) => {
    const r = radius + 18
    const x = cx + r * Math.cos(angle(i))
    const y = cy + r * Math.sin(angle(i))
    const anchor = x < cx - 1 ? 'end' : x > cx + 1 ? 'start' : 'middle'
    return { x, y, anchor: anchor as 'start' | 'middle' | 'end', text: d.metric }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
      {/* rings */}
      {[2, 4, 6, 8, 10].map(v => {
        const r = (radius * v) / 10
        return <circle key={v} cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--brand-border))" strokeWidth={v === 10 ? 1 : 0.5} />
      })}
      {/* axes */}
      {axisEnds.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgb(var(--brand-border))" strokeWidth={0.5} />
      ))}
      {/* data polygon */}
      <polygon
        points={polygon}
        fill="rgb(var(--brand-accent) / 0.15)"
        stroke="rgb(var(--brand-accent))"
        strokeWidth={1.5}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="rgb(var(--brand-accent))" />
      ))}
      {/* labels */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor={l.anchor}
          dominantBaseline="middle"
          className="text-[10px] font-medium"
          fill="rgb(var(--brand-slate))"
        >
          {l.text}
        </text>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Metric card (collapsible)                                          */
/* ------------------------------------------------------------------ */

function MetricCard({
  metricKey,
  label,
  weight,
  blurb,
  data,
  seniority,
}: {
  metricKey: string
  label: string
  weight: number
  blurb: string
  data: BaseMetric | undefined
  seniority?: string
}) {
  const [open, setOpen] = useState(false)
  const score = typeof data?.score === 'number' ? data.score : 0
  const tone = scoreToneClasses(score)
  const evidence = Array.isArray(data?.evidence) ? data!.evidence! : []
  const fixes = Array.isArray(data?.fixes) ? data!.fixes! : []

  // Pull out common metric-specific sub-fields for richer display
  const renderExtras = () => {
    if (!data) return null
    switch (metricKey) {
      case 'hard_skills':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ChipList label="Present" tone="success" items={data.present_skills} />
            <ChipList label="Missing (required)" tone="danger" items={data.missing_critical} />
            <ChipList label="Missing (preferred)" tone="warn" items={data.missing_preferred} />
            {typeof data.coverage_pct === 'number' && (
              <div className="md:col-span-3 text-xs text-brand-steel">
                JD-required coverage: <span className="font-semibold text-brand-ink">{data.coverage_pct}%</span>
              </div>
            )}
          </div>
        )
      case 'quantified_impact': {
        const ratio = typeof data.ratio_pct === 'number' ? data.ratio_pct : 0
        return (
          <div className="space-y-3">
            {typeof data.total_bullets === 'number' && (
              <div className="text-xs text-brand-steel">
                {data.quantified_bullets} of {data.total_bullets} bullets quantified · <span className="font-semibold text-brand-ink">{ratio}%</span>
              </div>
            )}
            {Array.isArray(data.strong_examples) && data.strong_examples.length > 0 && (
              <div>
                <div className="text-xs font-medium text-brand-slate mb-1">Strong bullets</div>
                <ul className="space-y-1">
                  {data.strong_examples.slice(0, 3).map((b: string, i: number) => (
                    <li key={i} className="text-xs text-brand-ink bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(data.weak_examples) && data.weak_examples.length > 0 && (
              <div>
                <div className="text-xs font-medium text-brand-slate mb-1">Rewrite candidates</div>
                <ul className="space-y-2">
                  {data.weak_examples.slice(0, 4).map((w: any, i: number) => (
                    <li key={i} className="text-xs bg-brand-mist/60 border border-brand-border rounded-lg p-2.5">
                      <div className="text-red-700 line-through">{w.quote}</div>
                      <div className="mt-1 text-emerald-800">→ {w.rewrite_suggestion}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      }
      case 'title_alignment':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <KeyVal k="JD title" v={data.jd_title} />
            <KeyVal k="Your current title" v={data.resume_current_title} />
            <KeyVal k="Previous title" v={data.resume_previous_title} />
            <KeyVal k="Gap" v={data.title_gap} />
          </div>
        )
      case 'cover_letter':
        return (
          <div className="space-y-2 text-xs">
            {data.present === false && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                No cover letter provided.
              </div>
            )}
            {data.opener_quote && (
              <div>
                <div className="font-medium text-brand-slate mb-1">Opener</div>
                <div className={`rounded-lg border p-2 ${data.generic_opener ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-brand-mist/60 border-brand-border text-brand-ink'}`}>
                  {data.opener_quote}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {typeof data.word_count === 'number' && <KeyVal k="Words" v={String(data.word_count)} />}
              {typeof data.company_references === 'number' && <KeyVal k="Company mentions" v={String(data.company_references)} />}
            </div>
          </div>
        )
      case 'parseability':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChipList label="Passed" tone="success" items={data.passed_checks} />
            {Array.isArray(data.failed_checks) && data.failed_checks.length > 0 && (
              <div>
                <div className="text-xs font-medium text-brand-slate mb-1">Failed</div>
                <ul className="space-y-1">
                  {data.failed_checks.map((f: any, i: number) => (
                    <li key={i} className="text-xs text-red-800 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                      <span className="font-medium">{typeof f === 'string' ? f : f.check}</span>
                      {f?.evidence && <span className="text-red-700"> — {f.evidence}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(data.vendor_risks) && data.vendor_risks.length > 0 && (
              <div className="md:col-span-2 text-xs text-brand-steel">
                Highest risk on: <span className="font-semibold text-brand-ink">{data.vendor_risks.join(', ')}</span>
              </div>
            )}
          </div>
        )
      case 'writing_mechanics':
        return (
          <div className="space-y-2">
            {Array.isArray(data.weak_verb_bullets) && data.weak_verb_bullets.length > 0 && (
              <div>
                <div className="text-xs font-medium text-brand-slate mb-1">Weak verbs</div>
                <ul className="space-y-1">
                  {data.weak_verb_bullets.slice(0, 4).map((b: any, i: number) => (
                    <li key={i} className="text-xs bg-brand-mist/60 border border-brand-border rounded-lg p-2">
                      <div className="text-red-700">{b.quote}</div>
                      {Array.isArray(b.stronger_options) && b.stronger_options.length > 0 && (
                        <div className="mt-1 text-emerald-800">→ try: {b.stronger_options.join(', ')}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ChipList label="Clichés detected" tone="warn" items={data.cliches_detected} />
          </div>
        )
      case 'bullet_hygiene':
        return (
          <div className="space-y-1">
            {Array.isArray(data.out_of_range_bullets) && data.out_of_range_bullets.length > 0 ? (
              data.out_of_range_bullets.slice(0, 5).map((b: any, i: number) => (
                <div key={i} className="text-xs bg-amber-50 border border-amber-100 rounded-lg p-2">
                  <div className="text-amber-900">{b.quote}</div>
                  <div className="text-amber-700 mt-0.5">{b.word_count} words — {b.issue}</div>
                </div>
              ))
            ) : (
              <div className="text-xs text-brand-steel">All bullets in range.</div>
            )}
          </div>
        )
      case 'soft_skills':
        return (
          <div className="space-y-2">
            <ChipList label="JD soft skills" items={data.jd_soft_skills} />
            {Array.isArray(data.demonstrations) && data.demonstrations.length > 0 && (
              <div>
                <div className="text-xs font-medium text-brand-slate mb-1">Demonstrated</div>
                <ul className="space-y-1">
                  {data.demonstrations.map((d: any, i: number) => (
                    <li key={i} className="text-xs bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                      <div className="font-medium text-emerald-900">{d.soft_skill}</div>
                      <div className="text-emerald-800">{d.resume_quote}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ChipList label="Only asserted (no evidence)" tone="warn" items={data.asserted_not_demonstrated} />
          </div>
        )
      case 'recency_progression':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <KeyVal k="Most relevant role (year)" v={data.most_relevant_role_year ? String(data.most_relevant_role_year) : '—'} />
            <KeyVal k="Trajectory" v={data.progression} />
            {Array.isArray(data.title_sequence) && data.title_sequence.length > 0 && (
              <div className="md:col-span-2">
                <div className="text-xs font-medium text-brand-slate mb-1">Title path</div>
                <div className="flex items-center flex-wrap gap-1 text-xs">
                  {data.title_sequence.map((t: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <span className="rounded-full bg-brand-mist border border-brand-border px-2 py-0.5 text-brand-ink">{t}</span>
                      {i < data.title_sequence.length - 1 && <ArrowRight className="w-3 h-3 text-brand-steel" />}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      case 'education_credentials':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChipList label="Required by JD" items={data.jd_required_credentials} />
            <ChipList label="Preferred by JD" items={data.jd_preferred_credentials} />
            {Array.isArray(data.candidate_credentials) && data.candidate_credentials.length > 0 && (
              <div className="md:col-span-2">
                <div className="text-xs font-medium text-brand-slate mb-1">Your credentials</div>
                <ul className="space-y-1">
                  {data.candidate_credentials.map((c: any, i: number) => (
                    <li key={i} className="text-xs bg-brand-mist/60 border border-brand-border rounded-lg px-2.5 py-1">
                      <span className="font-medium text-brand-ink">{c.credential}</span>
                      {c.issuer && <span className="text-brand-steel"> · {c.issuer}</span>}
                      {c.year && <span className="text-brand-steel"> · {c.year}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ChipList label="Gaps (required but missing)" tone="danger" items={data.gaps} />
          </div>
        )
      default:
        return null
    }
  }

  const evidenceList = evidence.filter(e => e.quote && e.quote.trim()).slice(0, 6)

  return (
    <article className="rounded-xl border border-brand-border bg-white shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-brand-mist/60 transition-colors"
      >
        <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${tone.bg} ring-1 ${tone.ring}`}>
          <div className={`text-xl font-bold font-display leading-none ${tone.text}`}>{score}</div>
          <div className="text-[9px] uppercase tracking-wider text-brand-steel mt-0.5">/ 10</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-brand-ink truncate">{label}</h3>
            <span className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">weight {weight}</span>
            {data?.band_label && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone.bg} ${tone.text} ${tone.ring}`}>
                {data.band_label}
              </span>
            )}
          </div>
          <p className="text-xs text-brand-steel truncate">
            {data?.summary || blurb}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-brand-steel flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-brand-border bg-brand-mist/30 px-5 py-4 space-y-4">
          {renderExtras()}
          {evidenceList.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1.5">Evidence</div>
              <ul className="space-y-1.5">
                {evidenceList.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Quote className="w-3 h-3 text-brand-steel flex-shrink-0 mt-0.5" />
                    <span className="text-brand-slate italic">{e.quote}</span>
                    {e.source && (
                      <span className="ml-auto rounded-full bg-white border border-brand-border px-1.5 py-0.5 text-[10px] text-brand-steel uppercase tracking-wider font-medium flex-shrink-0">
                        {e.source}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fixes.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1.5">Fixes</div>
              <ul className="space-y-2">
                {fixes.map((f, i) => (
                  <li key={i} className="text-xs bg-white border border-brand-border rounded-lg p-2.5">
                    <div className="font-medium text-brand-ink">{f.action}</div>
                    {f.why && <div className="text-brand-steel mt-0.5">{f.why}</div>}
                    {f.example && <div className="mt-1 font-mono text-[11px] text-brand-slate bg-brand-mist rounded px-2 py-1">{f.example}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {seniority && metricKey === 'education_credentials' && (
            <div className="text-[10px] text-brand-steel">
              Scored for <span className="font-semibold">{seniority}</span> seniority.
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function ChipList({ label, items, tone = 'neutral' }: { label: string; items?: string[]; tone?: 'neutral' | 'success' | 'warn' | 'danger' }) {
  if (!Array.isArray(items) || items.length === 0) return null
  const cls =
    tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : tone === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900'
    : tone === 'danger' ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-white border-brand-border text-brand-slate'
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((s, i) => (
          <span key={i} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{s}</span>
        ))}
      </div>
    </div>
  )
}

function KeyVal({ k, v }: { k: string; v?: any }) {
  if (!v) return null
  return (
    <div className="bg-white border border-brand-border rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">{k}</div>
      <div className="text-sm font-medium text-brand-ink truncate">{String(v)}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Keyword analysis table                                             */
/* ------------------------------------------------------------------ */

function KeywordTable({ rows }: { rows: EvaluationV2['keyword_analysis'] }) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => {
    const prio = (x: any) => (x.priority === 'required' ? 0 : 1)
    const stat = (x: any) => (x.status === 'missing' ? 0 : x.status === 'partial' ? 1 : 2)
    return prio(a) - prio(b) || stat(a) - stat(b)
  })
  return (
    <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-soft">
      <div className="px-5 py-3 bg-brand-mist border-b border-brand-border">
        <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Keyword Analysis</div>
        <h3 className="text-sm font-semibold text-brand-ink">JD terms vs your resume</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-brand-border sticky top-0">
            <tr className="text-[10px] uppercase tracking-wider text-brand-steel font-semibold">
              <th className="px-4 py-2 text-left">Term</th>
              <th className="px-4 py-2 text-center">JD</th>
              <th className="px-4 py-2 text-center">Resume</th>
              <th className="px-4 py-2 text-center">CL</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {sorted.map((r, i) => {
              const statusCls =
                r.status === 'matched' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : r.status === 'partial' ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
              const prioCls = r.priority === 'required'
                ? 'bg-brand-ink text-white'
                : 'bg-brand-mist text-brand-slate border border-brand-border'
              return (
                <tr key={i} className="hover:bg-brand-mist/40">
                  <td className="px-4 py-2 font-medium text-brand-ink">{r.term}</td>
                  <td className="px-4 py-2 text-center text-brand-slate">{r.in_jd ?? 0}</td>
                  <td className="px-4 py-2 text-center text-brand-slate">{r.in_resume ?? 0}</td>
                  <td className="px-4 py-2 text-center text-brand-slate">{r.in_cover_letter ?? 0}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusCls}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${prioCls}`}>{r.priority}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ATSResultsView({ evaluationResult, onNewEvaluation }: Props) {
  const result = (evaluationResult || {}) as EvaluationV2

  // Old-schema fallback: render a friendly shim rather than crash
  if (result.schema_version !== 'v2' && !result.metrics) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="rounded-xl border border-brand-border bg-white p-6 shadow-soft text-center">
          <AlertCircle className="w-8 h-8 text-brand-steel mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-brand-ink">Legacy evaluation format</h3>
          <p className="text-sm text-brand-steel mt-1">This evaluation used an older schema. Run a new evaluation to see the updated report.</p>
          {onNewEvaluation && (
            <div className="mt-5">
              <Button onClick={onNewEvaluation}>New evaluation</Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const overall = result.overall || {}
  const match = typeof overall.match_estimate === 'number' ? overall.match_estimate : 0
  const grade = overall.letter_grade || '—'
  const verdict = overall.verdict || ''
  const rec = actionTone(overall.recommended_action)
  const likelihood = likelihoodTone(overall.interview_likelihood || '')
  const knock = knockoutTone(result.knockouts?.risk)
  const seniority = result.meta?.seniority_inferred

  const radarData = useMemo(() => {
    const fromServer = result.chart_data?.radar
    if (Array.isArray(fromServer) && fromServer.length) {
      return fromServer.map(d => ({ metric: d.metric || '', score: typeof d.score === 'number' ? d.score : 0 }))
    }
    // Fallback: derive from metrics[]
    return METRIC_ORDER.map(m => ({
      metric: m.label,
      score: result.metrics?.[m.key]?.score ?? 0,
    }))
  }, [result])

  const strongest = useMemo(() => {
    const items = METRIC_ORDER.map(m => ({
      label: m.label,
      score: result.metrics?.[m.key]?.score ?? 0,
    }))
    return [...items].sort((a, b) => b.score - a.score)[0]
  }, [result])

  const weakest = useMemo(() => {
    const items = METRIC_ORDER.map(m => ({
      label: m.label,
      score: result.metrics?.[m.key]?.score ?? 0,
      weight: m.weight,
    }))
    // "Weakest" by weighted damage, so a low-scoring heavy metric surfaces first
    return [...items].sort((a, b) => (a.score * 10 - a.weight) - (b.score * 10 - b.weight))[0]
  }, [result])

  return (
    <div className="space-y-6">
      {/* ───────── Top summary ───────── */}
      <section className="rounded-xl border border-brand-border bg-white shadow-soft overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-0">
          {/* Score block */}
          <div className="p-6 border-b lg:border-b-0 lg:border-r border-brand-border bg-gradient-to-br from-brand-mist/40 to-white flex flex-col items-center justify-center">
            <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Match estimate</div>
            <div className={`mt-1 font-display font-bold text-6xl ${matchEstimateColor(match)}`}>{match}</div>
            <div className="text-xs text-brand-steel">of 100</div>
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${letterGradeColor(grade)}`}>
              Grade {grade}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${likelihood.dot}`} />
              <span className="text-brand-steel">Interview likelihood:</span>
              <span className={`font-semibold ${likelihood.text}`}>{likelihood.label}</span>
            </div>
            {seniority && (
              <div className="mt-2 text-[10px] uppercase tracking-wider text-brand-steel">
                Scored as {seniority}
              </div>
            )}
          </div>

          {/* Verdict + action */}
          <div className="p-6 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Verdict</div>
              <p className="mt-1 text-brand-ink leading-relaxed">{verdict || 'Evaluation complete.'}</p>
            </div>

            <div className={`rounded-xl border px-3 py-2.5 text-sm flex items-center gap-2.5 ${rec.cls}`}>
              <span className="flex-shrink-0">{rec.icon}</span>
              <span className="font-semibold">{rec.label}</span>
            </div>

            <div className={`rounded-xl border px-3 py-2.5 text-sm flex items-start gap-2.5 ${knock.cls}`}>
              <span className="flex-shrink-0 mt-0.5">{knock.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{knock.label}</div>
                {Array.isArray(result.knockouts?.items) && result.knockouts!.items!.length > 0 && (
                  <ul className="mt-1 space-y-1 text-xs">
                    {result.knockouts!.items!.map((k, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        {k.met
                          ? <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-600" />
                          : <XCircle className="w-3 h-3 mt-0.5 text-red-600" />}
                        <span>
                          <span className="font-medium">{k.type?.replace(/_/g, ' ')}:</span>{' '}
                          <span className="italic">{k.jd_requirement}</span>
                          {k.candidate_evidence && <span className="text-brand-steel"> — {k.candidate_evidence}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {onNewEvaluation && (
              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={onNewEvaluation}>New evaluation</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────── Radar + highlights ───────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-border bg-white shadow-soft p-5">
          <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Dimension radar</div>
          <h3 className="text-sm font-semibold text-brand-ink mb-2">All 10 metrics at a glance</h3>
          <RadarChart data={radarData} />
        </div>
        <div className="rounded-xl border border-brand-border bg-white shadow-soft p-5 space-y-4">
          <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Highlights</div>
          <div className="space-y-3">
            {strongest && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
                <Award className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-medium">Strongest</div>
                  <div className="text-sm font-semibold text-emerald-900">{strongest.label}</div>
                  <div className="text-xs text-emerald-800">{strongest.score}/10</div>
                </div>
              </div>
            )}
            {weakest && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <Target className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-700 font-medium">Highest-impact gap</div>
                  <div className="text-sm font-semibold text-amber-900">{weakest.label}</div>
                  <div className="text-xs text-amber-800">{weakest.score}/10 · weight {weakest.weight}</div>
                </div>
              </div>
            )}
            {result.chart_data?.coverage && (
              <div className="rounded-lg border border-brand-border bg-brand-mist/40 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">JD coverage</div>
                <div className="mt-1 flex items-center gap-4">
                  <div>
                    <div className="text-sm font-semibold text-brand-ink">{result.chart_data.coverage.required_skills_pct ?? 0}%</div>
                    <div className="text-[10px] text-brand-steel">required</div>
                  </div>
                  <div className="w-px h-8 bg-brand-border" />
                  <div>
                    <div className="text-sm font-semibold text-brand-ink">{result.chart_data.coverage.preferred_skills_pct ?? 0}%</div>
                    <div className="text-[10px] text-brand-steel">preferred</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────── Top fixes ───────── */}
      {Array.isArray(result.top_fixes) && result.top_fixes.length > 0 && (
        <section className="rounded-xl border border-brand-border bg-white shadow-soft overflow-hidden">
          <div className="px-5 py-3 bg-brand-mist border-b border-brand-border">
            <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Top Fixes</div>
            <h3 className="text-sm font-semibold text-brand-ink">Do these in order — biggest impact first</h3>
          </div>
          <ol className="divide-y divide-brand-border">
            {result.top_fixes.slice(0, 5).map((f, i) => (
              <li key={i} className="p-5 flex gap-4 hover:bg-brand-mist/30 transition-colors">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-ink text-white flex items-center justify-center text-xs font-bold">
                  {f.priority ?? i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div className="text-sm font-semibold text-brand-ink">{f.action}</div>
                    {f.metric && <span className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">{f.metric.replace(/_/g, ' ')}</span>}
                  </div>
                  {f.why && <div className="text-sm text-brand-slate mt-0.5">{f.why}</div>}
                  {f.estimated_lift && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      <TrendingIndicator /> {f.estimated_lift}
                    </div>
                  )}
                  {f.example && (
                    <div className="mt-2 text-[11px] font-mono text-brand-slate bg-brand-mist rounded-lg px-2.5 py-2">
                      {f.example}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ───────── Red flags ───────── */}
      {Array.isArray(result.red_flags) && result.red_flags.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <div className="text-[10px] uppercase tracking-wider text-amber-700 font-medium">Flagged (not deducted — context-dependent)</div>
          </div>
          <ul className="space-y-2">
            {result.red_flags.map((f, i) => (
              <li key={i} className="bg-white rounded-lg border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    f.severity === 'high' ? 'bg-red-600 text-white'
                    : f.severity === 'medium' ? 'bg-orange-500 text-white'
                    : f.severity === 'low' ? 'bg-amber-500 text-white'
                    : 'bg-brand-steel text-white'
                  }`}>
                    {f.severity || 'info'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-brand-ink">{f.type?.replace(/_/g, ' ')}</div>
                    {f.evidence && <div className="text-xs italic text-brand-slate mt-0.5">&quot;{f.evidence}&quot;</div>}
                    {f.context_note && <div className="text-xs text-brand-steel mt-1">{f.context_note}</div>}
                    {f.suggested_framing && (
                      <div className="text-xs text-emerald-800 mt-1">
                        <span className="font-medium">Try framing:</span> {f.suggested_framing}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── Metric breakdown ───────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Detailed Breakdown</div>
            <h3 className="text-sm font-semibold text-brand-ink">Click any metric to see evidence and fixes</h3>
          </div>
          <div className="text-xs text-brand-steel">10 metrics · weights sum to 100</div>
        </div>
        <div className="space-y-2">
          {METRIC_ORDER.map(m => (
            <MetricCard
              key={m.key}
              metricKey={m.key}
              label={m.label}
              weight={m.weight}
              blurb={m.blurb}
              data={result.metrics?.[m.key]}
              seniority={seniority}
            />
          ))}
        </div>
      </section>

      {/* ───────── Keyword table ───────── */}
      <KeywordTable rows={result.keyword_analysis} />
    </div>
  )
}

function TrendingIndicator() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M1 7l3-3 2 2 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 2h2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
