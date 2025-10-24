'use client'

import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus, ArrowLeft } from 'lucide-react'
import { Button } from './ui/Button'

interface ATSResultsViewProps {
  evaluationResult: any
  summarizedJD: string
  parsedResume: string
  parsedCoverLetter: string
  onNewEvaluation: () => void
}

const ScoreIndicator = ({ score }: { score: number }) => {
  const Icon = score >= 8 ? TrendingUp : score >= 6 ? Minus : TrendingDown
  const scoreColor = score >= 8 ? 'text-green-600' : score >= 6 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className={`flex items-center gap-2 ${scoreColor}`}>
      <Icon className="w-5 h-5" />
      <span className="text-3xl font-bold">{score.toFixed(1)}</span>
      <span className="text-lg font-medium text-gray-500">/10</span>
    </div>
  )
}

const getScoreBgColor = (score: number) => {
  if (score >= 8) return 'border-l-4 border-l-green-500'
  if (score >= 6) return 'border-l-4 border-l-yellow-500'
  return 'border-l-4 border-l-red-500'
}

export default function ATSResultsView({
  evaluationResult,
  summarizedJD,
  parsedResume,
  parsedCoverLetter,
  onNewEvaluation
}: ATSResultsViewProps) {

  if (!evaluationResult?.overall || !evaluationResult?.scores) {
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

  return (
    <div className="space-y-6">
      {/* Parsed Documents Section - AT THE TOP */}
      <div className="grid md:grid-cols-3 gap-4">
        <details open className="bg-white border border-gray-300 rounded-lg shadow-sm">
          <summary className="px-4 py-3 bg-gray-900 cursor-pointer font-semibold text-white hover:bg-gray-800 rounded-t-lg">
            Job Description
          </summary>
          <div className="p-4 max-h-96 overflow-y-auto bg-white">
            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {summarizedJD}
            </div>
          </div>
        </details>

        <details open className="bg-white border border-gray-300 rounded-lg shadow-sm">
          <summary className="px-4 py-3 bg-gray-900 cursor-pointer font-semibold text-white hover:bg-gray-800 rounded-t-lg">
            Resume
          </summary>
          <div className="p-4 max-h-96 overflow-y-auto bg-white">
            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {parsedResume}
            </div>
          </div>
        </details>

        <details open className="bg-white border border-gray-300 rounded-lg shadow-sm">
          <summary className="px-4 py-3 bg-gray-900 cursor-pointer font-semibold text-white hover:bg-gray-800 rounded-t-lg">
            Cover Letter
          </summary>
          <div className="p-4 max-h-96 overflow-y-auto bg-white">
            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {parsedCoverLetter}
            </div>
          </div>
        </details>
      </div>

      {/* Executive Summary */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-900">
          <h2 className="text-lg font-bold text-white">Executive Summary</h2>
        </div>
        <div className="p-6 bg-white">
          <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
            {evaluationResult.summary}
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-900">
          <h2 className="text-lg font-bold text-white">Overall Score</h2>
        </div>
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <ScoreIndicator score={evaluationResult.overall.weighted_score} />
              <div className="mt-3 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                {evaluationResult.overall.rationale}
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          {evaluationResult.overall.weights && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-200">
              {Object.entries(evaluationResult.overall.weights).map(([key, weight]) => (
                <div key={key} className="text-center">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{((weight as number) * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Scores */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Role Fit */}
        <div className={`bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden ${getScoreBgColor(evaluationResult.scores.role_fit.score)}`}>
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Role Fit & Requirements</h3>
              <ScoreIndicator score={evaluationResult.scores.role_fit.score} />
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {evaluationResult.scores.role_fit.evidence_found?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Evidence Found
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.role_fit.evidence_found.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluationResult.scores.role_fit.gaps?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Gaps
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.role_fit.gaps.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluationResult.scores.role_fit.fixes?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Recommended Fixes</h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.role_fit.fixes.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Skills & Keywords */}
        <div className={`bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden ${getScoreBgColor(evaluationResult.scores.skills_keywords.score)}`}>
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Skills & Keywords</h3>
              <ScoreIndicator score={evaluationResult.scores.skills_keywords.score} />
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {evaluationResult.scores.skills_keywords.present?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Present
                </h4>
                <div className="flex flex-wrap gap-2">
                  {evaluationResult.scores.skills_keywords.present.map((skill: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {evaluationResult.scores.skills_keywords.missing?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Missing
                </h4>
                <div className="flex flex-wrap gap-2">
                  {evaluationResult.scores.skills_keywords.missing.map((skill: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {evaluationResult.scores.skills_keywords.fixes?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Recommended Fixes</h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.skills_keywords.fixes.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Impact Evidence */}
        <div className={`bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden ${getScoreBgColor(evaluationResult.scores.impact_evidence.score)}`}>
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Impact & Evidence</h3>
              <ScoreIndicator score={evaluationResult.scores.impact_evidence.score} />
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {evaluationResult.scores.impact_evidence.issues?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Issues
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.impact_evidence.issues.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluationResult.scores.impact_evidence.example_rewrites?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Example Rewrites</h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.impact_evidence.example_rewrites.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ATS Compliance */}
        <div className={`bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden ${getScoreBgColor(evaluationResult.scores.ats_compliance.score)}`}>
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">ATS Compliance</h3>
              <ScoreIndicator score={evaluationResult.scores.ats_compliance.score} />
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {evaluationResult.scores.ats_compliance.problems?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Problems
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.ats_compliance.problems.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluationResult.scores.ats_compliance.fixes?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Recommended Fixes</h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.ats_compliance.fixes.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Cover Letter */}
        <div className={`bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden ${getScoreBgColor(evaluationResult.scores.cover_letter.score)}`}>
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Cover Letter</h3>
              <ScoreIndicator score={evaluationResult.scores.cover_letter.score} />
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {evaluationResult.scores.cover_letter.critique?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Critique
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.cover_letter.critique.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluationResult.scores.cover_letter.fixes?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Recommended Fixes</h4>
                <ul className="list-disc list-inside space-y-1">
                  {evaluationResult.scores.cover_letter.fixes.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Priority Fixes */}
      {evaluationResult.top_fixes?.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-900">
            <h2 className="text-lg font-bold text-white">Top Priority Fixes</h2>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {evaluationResult.top_fixes.map((fix: any, idx: number) => (
              <div key={idx} className="border-l-4 border-l-gray-900 pl-4 py-2">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{fix.area}</h4>
                    <div className="text-sm text-gray-900 space-y-2">
                      <p><strong>Action:</strong> {fix.action}</p>
                      <p><strong>Why:</strong> {fix.why}</p>
                      {fix.example && (
                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Example:</p>
                          <div className="text-sm text-gray-700">{fix.example}</div>
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

      {/* Risk Flags */}
      {evaluationResult.risk_flags?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-red-900">
            <h2 className="text-lg font-bold text-white">⚠️ Risk Flags</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-2">
              {evaluationResult.risk_flags.map((flag: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-900">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

