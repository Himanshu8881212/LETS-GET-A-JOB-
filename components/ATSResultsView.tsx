'use client'

import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './ui/Button'
import ReactMarkdown from 'react-markdown'
import { useState } from 'react'

// Helper component to render markdown text
const MarkdownText = ({ children, className = '' }: { children: string, className?: string }) => (
  <div className={`prose prose-sm max-w-none ${className}`}>
    <ReactMarkdown
      components={{
        p: ({ children }) => <span className="text-gray-900">{children}</span>,
        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-900">{children}</em>,
        code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-900">{children}</code>,
        ul: ({ children }) => <ul className="list-disc list-inside mt-1 space-y-1 text-gray-900">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-900">{children}</ol>,
        li: ({ children }) => <li className="text-sm text-gray-900">{children}</li>,
        a: ({ href, children }) => <a href={href} className="text-blue-700 underline">{children}</a>,
        pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto my-2 text-gray-900">{children}</pre>,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
)

interface ATSResultsViewProps {
  evaluationResult: any
  summarizedJD: string
  parsedResume: string
  parsedCoverLetter: string
  onNewEvaluation: () => void
}

// Score color utilities
const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-green-600'
  if (score >= 6) return 'text-yellow-600'
  return 'text-red-600'
}

const getScoreBgColor = (score: number) => {
  if (score >= 8) return 'bg-green-500'
  if (score >= 6) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getScoreBorderColor = (score: number) => {
  if (score >= 8) return 'border-l-4 border-l-green-500'
  if (score >= 6) return 'border-l-4 border-l-yellow-500'
  return 'border-l-4 border-l-red-500'
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'bg-green-500 text-white'
    case 'B': return 'bg-blue-500 text-white'
    case 'C': return 'bg-yellow-500 text-white'
    case 'D': return 'bg-orange-500 text-white'
    case 'F': return 'bg-red-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

const getLikelihoodColor = (likelihood: string) => {
  switch (likelihood) {
    case 'HIGH': return 'bg-green-100 text-green-800'
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
    case 'LOW': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Radar Chart Component (CSS-based)
const RadarChart = ({ data }: { data: Array<{ pillar: string, score: number }> }) => {
  const size = 200
  const center = size / 2
  const maxRadius = 80
  const numPoints = data.length

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / numPoints - Math.PI / 2
    const radius = (value / 10) * maxRadius
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  const labelPosition = (index: number) => {
    const angle = (Math.PI * 2 * index) / numPoints - Math.PI / 2
    const radius = maxRadius + 25
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  const points = data.map((d, i) => getPoint(i, d.score))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  // Background grid
  const gridLevels = [2, 4, 6, 8, 10]
  const gridPaths = gridLevels.map(level => {
    const gridPoints = data.map((_, i) => getPoint(i, level))
    return gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  })

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid lines */}
        {gridPaths.map((path, i) => (
          <path key={i} d={path} fill="none" stroke="#e5e7eb" strokeWidth="1" />
        ))}
        {/* Axis lines */}
        {data.map((_, i) => {
          const end = getPoint(i, 10)
          return (
            <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#d1d5db" strokeWidth="1" />
          )
        })}
        {/* Data polygon */}
        <path d={pathD} fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth="2" />
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" />
        ))}
        {/* Labels */}
        {data.map((d, i) => {
          const pos = labelPosition(i)
          return (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-gray-700"
            >
              {d.pillar.split(' ')[0]}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// Horizontal Bar Chart Component
const ScoreBar = ({ label, score, max = 10 }: { label: string, score: number, max?: number }) => {
  const percentage = (score / max) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs font-medium text-gray-700 truncate">{label}</div>
      <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getScoreBgColor(score)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`w-8 text-sm font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</div>
    </div>
  )
}

// Collapsible Metric Card
const MetricCard = ({
  title,
  score,
  pillar,
  children,
  defaultOpen = false
}: {
  title: string
  score: number
  pillar: string
  children: React.ReactNode
  defaultOpen?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const pillarColors: Record<string, string> = {
    'technical_fit': 'bg-blue-50 border-blue-200',
    'impact_performance': 'bg-purple-50 border-purple-200',
    'communication': 'bg-green-50 border-green-200',
    'cultural_fit': 'bg-orange-50 border-orange-200',
    'risk_assessment': 'bg-red-50 border-red-200'
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${pillarColors[pillar] || 'bg-white border-gray-200'} ${getScoreBorderColor(score)}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getScoreBgColor(score)}`}>
            {score.toFixed(0)}
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 bg-white border-t">
          {children}
        </div>
      )}
    </div>
  )
}

// Pillar Group Component
const PillarGroup = ({
  title,
  score,
  weight,
  color,
  children
}: {
  title: string
  score: number
  weight: number
  color: string
  children: React.ReactNode
}) => (
  <div className="space-y-3">
    <div className={`p-4 rounded-lg ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">Weight: {(weight * 100).toFixed(0)}%</p>
        </div>
        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score.toFixed(1)}/10
        </div>
      </div>
    </div>
    <div className="space-y-2 pl-2">
      {children}
    </div>
  </div>
)

export default function ATSResultsView({
  evaluationResult,
  summarizedJD,
  parsedResume,
  parsedCoverLetter,
  onNewEvaluation
}: ATSResultsViewProps) {

  // Handle old schema format (backward compatibility)
  const isNewSchema = evaluationResult?.metrics && evaluationResult?.pillar_scores

  if (!evaluationResult?.overall) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 mb-1">Invalid Evaluation Response</h3>
            <p className="text-sm text-red-800">
              The evaluation response is missing required data. Please try again.
            </p>
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(evaluationResult, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  const { overall, pillar_scores, metrics, chart_data, top_5_fixes, keyword_analysis } = evaluationResult

  return (
    <div className="space-y-6">
      {/* Parsed Documents Section */}
      <div className="grid md:grid-cols-3 gap-4">
        <details className="bg-white border border-gray-300 rounded-lg shadow-sm">
          <summary className="px-4 py-3 bg-gray-900 cursor-pointer font-semibold text-white hover:bg-gray-800 rounded-t-lg">
            Job Description
          </summary>
          <div className="p-4 max-h-60 overflow-y-auto bg-white">
            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {summarizedJD}
            </div>
          </div>
        </details>

        <details className="bg-white border border-gray-300 rounded-lg shadow-sm">
          <summary className="px-4 py-3 bg-gray-900 cursor-pointer font-semibold text-white hover:bg-gray-800 rounded-t-lg">
            Resume
          </summary>
          <div className="p-4 max-h-60 overflow-y-auto bg-white">
            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {parsedResume}
            </div>
          </div>
        </details>

        <details className="bg-white border border-gray-300 rounded-lg shadow-sm">
          <summary className="px-4 py-3 bg-gray-900 cursor-pointer font-semibold text-white hover:bg-gray-800 rounded-t-lg">
            Cover Letter
          </summary>
          <div className="p-4 max-h-60 overflow-y-auto bg-white">
            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {parsedCoverLetter}
            </div>
          </div>
        </details>
      </div>

      {/* Overall Score Dashboard */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-900">
          <h2 className="text-lg font-bold text-white">Evaluation Dashboard</h2>
        </div>
        <div className="p-6">
          {/* Main Score Display */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Score Circle */}
            <div className="flex flex-col items-center justify-center">
              <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center ${getScoreBgColor(overall.weighted_score)}`}>
                <span className="text-4xl font-bold text-white">{overall.weighted_score?.toFixed(1) || '0.0'}</span>
                <span className="text-sm text-white/80">/10</span>
              </div>
              {overall.letter_grade && (
                <div className={`mt-3 px-4 py-1 rounded-full font-bold text-lg ${getGradeColor(overall.letter_grade)}`}>
                  Grade: {overall.letter_grade}
                </div>
              )}
            </div>

            {/* Likelihood Badges */}
            <div className="flex flex-col justify-center space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 w-32">ATS Pass:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getLikelihoodColor(overall.ats_pass_likelihood)}`}>
                  {overall.ats_pass_likelihood}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 w-32">Interview:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getLikelihoodColor(overall.interview_likelihood)}`}>
                  {overall.interview_likelihood}
                </span>
              </div>
            </div>

            {/* Radar Chart */}
            {chart_data?.radar_chart && (
              <div>
                <RadarChart data={chart_data.radar_chart} />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <MarkdownText className="text-gray-700">{evaluationResult.summary || ''}</MarkdownText>
            {overall.rationale && (
              <p className="text-sm text-gray-500 mt-2 italic">{overall.rationale}</p>
            )}
          </div>
        </div>
      </div>

      {/* Score Bars Overview */}
      {chart_data?.score_bars && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-900">
            <h2 className="text-lg font-bold text-white">All 12 Metrics at a Glance</h2>
          </div>
          <div className="p-6 space-y-3">
            {chart_data.score_bars.map((bar: { metric: string, score: number, max: number }, idx: number) => (
              <ScoreBar key={idx} label={bar.metric} score={bar.score} max={bar.max} />
            ))}
          </div>
        </div>
      )}

      {/* Pillar-Based Detailed Metrics */}
      {isNewSchema && metrics && pillar_scores && (
        <div className="space-y-6">
          {/* PILLAR 1: Technical Fit */}
          <PillarGroup
            title="🔧 Technical Fit"
            score={pillar_scores.technical_fit?.score || 0}
            weight={pillar_scores.technical_fit?.weight || 0.35}
            color="bg-blue-50"
          >
            {metrics.hard_requirements && (
              <MetricCard title="Hard Requirements" score={metrics.hard_requirements.score} pillar="technical_fit">
                {metrics.hard_requirements.evidence?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Evidence Found
                    </h5>
                    {metrics.hard_requirements.evidence.map((e: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-green-200 mb-1"><MarkdownText>{e}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.hard_requirements.gaps?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Gaps
                    </h5>
                    {metrics.hard_requirements.gaps.map((g: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-red-200 mb-1"><MarkdownText>{g}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.hard_requirements.fixes?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-blue-700 mb-1">Fixes</h5>
                    {metrics.hard_requirements.fixes.map((f: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-blue-200 bg-blue-50 p-2 rounded mb-1 text-gray-900"><MarkdownText className="text-gray-900">{f}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}

            {metrics.technical_skills && (
              <MetricCard title="Technical Skills & Keywords" score={metrics.technical_skills.score} pillar="technical_fit">
                {metrics.technical_skills.keyword_match_rate && (
                  <div className="mb-3 p-2 bg-gray-100 rounded text-sm font-medium">
                    Keyword Match: {metrics.technical_skills.keyword_match_rate}
                  </div>
                )}
                {metrics.technical_skills.present?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Present</h5>
                    <div className="flex flex-wrap gap-1">
                      {metrics.technical_skills.present.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {metrics.technical_skills.missing_critical?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Missing (Critical)</h5>
                    <div className="flex flex-wrap gap-1">
                      {metrics.technical_skills.missing_critical.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {metrics.technical_skills.fixes?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-blue-700 mb-1">Fixes</h5>
                    {metrics.technical_skills.fixes.map((f: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-blue-200 bg-blue-50 p-2 rounded mb-1 text-gray-900"><MarkdownText className="text-gray-900">{f}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}

            {metrics.certifications && (
              <MetricCard title="Certifications & Credentials" score={metrics.certifications.score} pillar="technical_fit">
                {metrics.certifications.found?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Found</h5>
                    <div className="flex flex-wrap gap-1">
                      {metrics.certifications.found.map((c: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {metrics.certifications.recommendations?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-blue-700 mb-1">Recommendations</h5>
                    {metrics.certifications.recommendations.map((r: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-blue-200 mb-1"><MarkdownText>{r}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}
          </PillarGroup>

          {/* PILLAR 2: Impact & Performance */}
          <PillarGroup
            title="📈 Impact & Performance"
            score={pillar_scores.impact_performance?.score || 0}
            weight={pillar_scores.impact_performance?.weight || 0.25}
            color="bg-purple-50"
          >
            {metrics.quantified_impact && (
              <MetricCard title="Quantified Impact" score={metrics.quantified_impact.score} pillar="impact_performance" defaultOpen>
                {metrics.quantified_impact.strong_bullets?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Strong Bullets</h5>
                    {metrics.quantified_impact.strong_bullets.map((b: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-green-200 mb-1"><MarkdownText>{b}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.quantified_impact.weak_bullets?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Weak Bullets (Need Metrics)</h5>
                    {metrics.quantified_impact.weak_bullets.map((b: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-red-200 mb-1"><MarkdownText>{b}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.quantified_impact.example_rewrites?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-blue-700 mb-1">Example Rewrites</h5>
                    {metrics.quantified_impact.example_rewrites.map((r: any, i: number) => (
                      <div key={i} className="bg-gray-50 p-3 rounded border mb-2 border-gray-200">
                        <p className="text-sm text-gray-900"><strong className="text-red-700">Before:</strong> <span className="text-gray-800">{r.original}</span></p>
                        <p className="text-sm text-gray-900"><strong className="text-green-700">After:</strong> <span className="text-gray-800">{r.improved}</span></p>
                        {r.why && <p className="text-xs text-gray-600 mt-1 italic">Why: {r.why}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}

            {metrics.career_trajectory && (
              <MetricCard title="Career Trajectory" score={metrics.career_trajectory.score} pillar="impact_performance">
                {metrics.career_trajectory.trajectory && (
                  <div className="mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${metrics.career_trajectory.trajectory === 'RISING' ? 'bg-green-100 text-green-800' :
                      metrics.career_trajectory.trajectory === 'STABLE' ? 'bg-blue-100 text-blue-800' :
                        metrics.career_trajectory.trajectory === 'DECLINING' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {metrics.career_trajectory.trajectory}
                    </span>
                  </div>
                )}
                {metrics.career_trajectory.strengths?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Strengths</h5>
                    {metrics.career_trajectory.strengths.map((s: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-green-200 mb-1 text-gray-900"><MarkdownText className="text-gray-900">{s}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.career_trajectory.concerns?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Concerns</h5>
                    {metrics.career_trajectory.concerns.map((c: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-red-200 mb-1 text-gray-900"><MarkdownText className="text-gray-900">{c}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}
          </PillarGroup>

          {/* PILLAR 3: Communication */}
          <PillarGroup
            title="✍️ Communication"
            score={pillar_scores.communication?.score || 0}
            weight={pillar_scores.communication?.weight || 0.15}
            color="bg-green-50"
          >
            {metrics.writing_quality && (
              <MetricCard title="Writing Quality" score={metrics.writing_quality.score} pillar="communication">
                {metrics.writing_quality.strengths?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Strengths</h5>
                    {metrics.writing_quality.strengths.map((s: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-green-200 mb-1 text-gray-900"><MarkdownText className="text-gray-900">{s}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.writing_quality.issues?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Issues</h5>
                    {metrics.writing_quality.issues.map((issue: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-red-200 mb-1 text-gray-900"><MarkdownText className="text-gray-900">{issue}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}

            {metrics.ats_compliance && (
              <MetricCard title="ATS Compliance" score={metrics.ats_compliance.score} pillar="communication">
                {metrics.ats_compliance.passed_checks?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Passed</h5>
                    <div className="flex flex-wrap gap-1">
                      {metrics.ats_compliance.passed_checks.map((c: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-green-100 text-green-900 text-xs rounded border border-green-200">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {metrics.ats_compliance.failed_checks?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Failed</h5>
                    <div className="flex flex-wrap gap-1">
                      {metrics.ats_compliance.failed_checks.map((c: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-900 text-xs rounded border border-red-200">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </MetricCard>
            )}
          </PillarGroup>

          {/* PILLAR 4: Cultural Fit */}
          <PillarGroup
            title="🤝 Cultural & Strategic Fit"
            score={pillar_scores.cultural_fit?.score || 0}
            weight={pillar_scores.cultural_fit?.weight || 0.15}
            color="bg-orange-50"
          >
            {metrics.soft_skills && (
              <MetricCard title="Soft Skills & Leadership" score={metrics.soft_skills.score} pillar="cultural_fit">
                {metrics.soft_skills.evidence?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Evidence</h5>
                    {metrics.soft_skills.evidence.map((e: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-green-200 mb-1 text-gray-900"><MarkdownText className="text-gray-900">{e}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.soft_skills.gaps?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Gaps</h5>
                    {metrics.soft_skills.gaps.map((g: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-red-200 mb-1 text-gray-900"><MarkdownText className="text-gray-900">{g}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}

            {metrics.industry_fit && (
              <MetricCard title="Industry/Domain Fit" score={metrics.industry_fit.score} pillar="cultural_fit">
                {metrics.industry_fit.alignment && (
                  <div className="mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${metrics.industry_fit.alignment === 'STRONG' ? 'bg-green-100 text-green-800' :
                      metrics.industry_fit.alignment === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {metrics.industry_fit.alignment}
                    </span>
                  </div>
                )}
                {metrics.industry_fit.relevant_experience?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Relevant Experience</h5>
                    {metrics.industry_fit.relevant_experience.map((e: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-green-200 mb-1 text-gray-900"><MarkdownText className="text-gray-900">{e}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}

            {metrics.cover_letter && (
              <MetricCard title="Cover Letter" score={metrics.cover_letter.score} pillar="cultural_fit">
                {metrics.cover_letter.strengths?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Strengths</h5>
                    {metrics.cover_letter.strengths.map((s: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-green-200 mb-1"><MarkdownText>{s}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.cover_letter.weaknesses?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Weaknesses</h5>
                    {metrics.cover_letter.weaknesses.map((w: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-red-200 mb-1"><MarkdownText>{w}</MarkdownText></div>
                    ))}
                  </div>
                )}
                {metrics.cover_letter.fixes?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-blue-700 mb-1">Fixes</h5>
                    {metrics.cover_letter.fixes.map((f: string, i: number) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-blue-200 bg-blue-50 p-2 rounded mb-1 text-gray-900"><MarkdownText className="text-gray-900">{f}</MarkdownText></div>
                    ))}
                  </div>
                )}
              </MetricCard>
            )}
          </PillarGroup>

          {/* PILLAR 5: Risk Assessment */}
          <PillarGroup
            title="⚠️ Risk Assessment"
            score={pillar_scores.risk_assessment?.score || 0}
            weight={pillar_scores.risk_assessment?.weight || 0.10}
            color="bg-red-50"
          >
            {metrics.red_flags && (
              <MetricCard title="Red Flags" score={metrics.red_flags.score} pillar="risk_assessment">
                {metrics.red_flags.flags?.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.red_flags.flags.map((f: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-sm text-gray-900">{f.flag}</span>
                          {f.severity && (
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded ${f.severity === 'HIGH' ? 'bg-red-200 text-red-800' :
                              f.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>{f.severity}</span>
                          )}
                          {f.mitigation && <p className="text-xs text-gray-600 mt-1">Mitigation: {f.mitigation}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">No red flags detected</span>
                  </div>
                )}
              </MetricCard>
            )}

            {metrics.skill_recency && (
              <MetricCard title="Skill Recency" score={metrics.skill_recency.score} pillar="risk_assessment">
                {metrics.skill_recency.fresh_skills?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-green-700 mb-1">Fresh Skills (Recent)</h5>
                    <div className="flex flex-wrap gap-1">
                      {metrics.skill_recency.fresh_skills.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {metrics.skill_recency.outdated_skills?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-bold text-red-700 mb-1">Outdated Skills</h5>
                    <div className="flex flex-wrap gap-1">
                      {metrics.skill_recency.outdated_skills.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </MetricCard>
            )}
          </PillarGroup>
        </div>
      )}

      {/* Top Priority Fixes */}
      {top_5_fixes?.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-900">
            <h2 className="text-lg font-bold text-white">🎯 Top Priority Fixes</h2>
          </div>
          <div className="p-6 space-y-4">
            {top_5_fixes.map((fix: any, idx: number) => (
              <div key={idx} className="border-l-4 border-l-blue-500 pl-4 py-3 bg-blue-50 rounded-r">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {fix.priority || idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{fix.area}</h4>
                      {fix.metric && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{fix.metric}</span>}
                    </div>
                    <div className="text-sm text-gray-800 space-y-1">
                      <div className="flex flex-col gap-1">
                        <strong className="text-gray-900">Action:</strong>
                        <MarkdownText className="text-gray-800">{fix.action}</MarkdownText>
                      </div>
                      {fix.impact && <p><strong className="text-gray-900">Impact:</strong> <span className="text-gray-800">{fix.impact}</span></p>}
                      {fix.example && (
                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Example:</p>
                          <MarkdownText className="text-gray-600 italic">{fix.example}</MarkdownText>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyword Analysis */}
      {keyword_analysis?.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-900">
            <h2 className="text-lg font-bold text-white">🔍 Keyword Analysis</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 text-gray-900 font-semibold">Keyword</th>
                    <th className="text-center py-2 px-2 text-gray-900 font-semibold">JD</th>
                    <th className="text-center py-2 px-2 text-gray-900 font-semibold">Resume</th>
                    <th className="text-center py-2 px-2 text-gray-900 font-semibold">CL</th>
                    <th className="text-center py-2 px-2 text-gray-900 font-semibold">Status</th>
                    <th className="text-center py-2 px-2 text-gray-900 font-semibold">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {keyword_analysis.slice(0, 15).map((kw: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-900">{kw.keyword}</td>
                      <td className="text-center py-2 px-2 text-gray-700">{kw.jd_count}</td>
                      <td className="text-center py-2 px-2 text-gray-700">{kw.resume_count}</td>
                      <td className="text-center py-2 px-2 text-gray-700">{kw.cl_count}</td>
                      <td className="text-center py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${kw.status === 'MATCHED' ? 'bg-green-100 text-green-800' :
                          kw.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>{kw.status}</span>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${kw.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          kw.priority === 'IMPORTANT' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>{kw.priority}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
