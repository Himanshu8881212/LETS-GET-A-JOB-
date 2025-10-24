'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Calendar, ExternalLink, MoreVertical, Pencil, Trash2, Check, X, RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import ATSResultsView from '@/components/ATSResultsView'

interface EvaluationHistoryItem {
  id: number
  job_url: string
  overall_score: number
  created_at: string
  job_description_text: string
  resume_text: string
  cover_letter_text: string
  evaluation_result: string | object
  custom_name?: string
}

interface ATSHistoryPageContentProps {
  onBack?: () => void
  evaluationId?: string
  onNavigateToEvaluator?: () => void
  onNavigateToTracker?: (prefillData: any, autoOpenModal?: boolean) => void
}

function ATSHistoryPageContent({
  onBack,
  evaluationId: propEvaluationId,
  onNavigateToEvaluator,
  onNavigateToTracker
}: ATSHistoryPageContentProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistoryItem[]>([])
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationHistoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Rename/Delete states
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadEvaluationHistory()
  }, [])

  useEffect(() => {
    // Check if there's an ID in the URL query params or passed as prop
    const evaluationId = propEvaluationId || searchParams.get('id')
    if (evaluationId && evaluationHistory.length > 0) {
      const evaluation = evaluationHistory.find(e => e.id === parseInt(evaluationId))
      if (evaluation) {
        setSelectedEvaluation(evaluation)
      } else {
        // ID not found, select most recent
        setSelectedEvaluation(evaluationHistory[0])
      }
    } else if (evaluationHistory.length > 0 && !selectedEvaluation) {
      // No ID in URL, select the most recent evaluation by default
      setSelectedEvaluation(evaluationHistory[0])
    }
  }, [searchParams, evaluationHistory, selectedEvaluation, router])

  const loadEvaluationHistory = async () => {
    setIsLoading(true)
    try {
      // Request full data including texts and evaluation results
      const response = await fetch('/api/ats-evaluations?full=true')
      if (response.ok) {
        const data = await response.json()
        const evaluations = data.evaluations || []

        // Filter out evaluations that don't have evaluation_result yet
        const completedEvaluations = evaluations.filter((e: EvaluationHistoryItem) => e.evaluation_result)

        setEvaluationHistory(completedEvaluations)

        if (completedEvaluations.length === 0) {
          showToast('info', 'No completed evaluations found')
        }
      } else {
        showToast('error', 'Failed to load evaluation history')
      }
    } catch (error) {
      console.error('Error loading evaluation history:', error)
      showToast('error', 'Failed to load evaluation history')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectEvaluation = (evaluation: EvaluationHistoryItem) => {
    if (selectedEvaluation?.id === evaluation.id) return // Already selected

    setIsTransitioning(true)
    setSelectedEvaluation(evaluation)

    // Remove transition after animation
    setTimeout(() => setIsTransitioning(false), 150)
  }

  const handleNewEvaluation = () => {
    // Navigate to evaluator
    if (onNavigateToEvaluator) {
      onNavigateToEvaluator()
    } else if (onBack) {
      onBack()
    } else {
      router.push('/?tab=ai-evaluator')
    }
  }

  const handleApply = (evaluation: EvaluationHistoryItem) => {
    setMenuOpenId(null)

    // Extract company and position from custom_name or job description
    const defaultName = getDefaultName(evaluation)
    const parts = defaultName.split(' : ')
    const position = parts[0] || 'Position'
    const company = parts[1] || 'Company'

    // Validate job URL is present (required field)
    if (!evaluation.job_url) {
      showToast('error', 'Cannot apply: Job URL is missing')
      return
    }

    // Prepare pre-fill data for the modal
    const jobData = {
      company,
      position,
      jobUrl: evaluation.job_url,
      jobDescription: evaluation.job_description_text,
      resumeVersionId: evaluation.resume_version_id || null,
      coverLetterVersionId: evaluation.cover_letter_version_id || null
    }

    // Encode job data for URL
    // Open job URL in new tab
    window.open(evaluation.job_url, '_blank')

    // Navigate to job tracker with pre-filled data and auto-open modal
    if (onNavigateToTracker) {
      onNavigateToTracker(jobData, true)
    } else {
      const jobDataEncoded = encodeURIComponent(JSON.stringify(jobData))
      router.push(`/?tab=tracker&prefill=${jobDataEncoded}&autoOpen=true`)
    }
  }

  const handleRename = async (id: number, newName: string) => {
    try {
      const response = await fetch(`/api/ats-evaluations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_name: newName })
      })

      if (response.ok) {
        setEvaluationHistory(prev =>
          prev.map(e => e.id === id ? { ...e, custom_name: newName } : e)
        )
        if (selectedEvaluation?.id === id) {
          setSelectedEvaluation(prev => prev ? { ...prev, custom_name: newName } : null)
        }
        showToast('success', 'Evaluation renamed successfully')
      } else {
        showToast('error', 'Failed to rename evaluation')
      }
    } catch (error) {
      console.error('Error renaming evaluation:', error)
      showToast('error', 'Failed to rename evaluation')
    }
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this evaluation? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/ats-evaluations/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setEvaluationHistory(prev => prev.filter(e => e.id !== id))
        if (selectedEvaluation?.id === id) {
          const remaining = evaluationHistory.filter(e => e.id !== id)
          if (remaining.length > 0) {
            handleSelectEvaluation(remaining[0])
          } else {
            setSelectedEvaluation(null)
          }
        }
        showToast('success', 'Evaluation deleted successfully')
      } else {
        showToast('error', 'Failed to delete evaluation')
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error)
      showToast('error', 'Failed to delete evaluation')
    }
    setMenuOpenId(null)
  }

  const startRename = (evaluation: EvaluationHistoryItem) => {
    setEditingId(evaluation.id)
    setEditingName(evaluation.custom_name || getDefaultName(evaluation))
    setMenuOpenId(null)
  }

  const getDefaultName = (evaluation: EvaluationHistoryItem) => {
    // Try to extract position and company from job description text
    if (evaluation.job_description_text) {
      const text = evaluation.job_description_text

      // Common patterns for position and company
      const positionMatch = text.match(/(?:Position|Role|Title|Job Title):\s*([^\n]+)/i) ||
        text.match(/^([^\n]+?)(?:\s+at\s+|\s+-\s+)/i)
      const companyMatch = text.match(/(?:Company|Organization|Employer):\s*([^\n]+)/i) ||
        text.match(/\s+at\s+([^\n]+)/i)

      const position = positionMatch?.[1]?.trim()
      const company = companyMatch?.[1]?.trim()

      if (position && company) {
        return `${position} : ${company}`
      } else if (position) {
        return position
      } else if (company) {
        return company
      }
    }

    // Fallback to URL hostname
    if (evaluation.job_url) {
      try {
        const hostname = new URL(evaluation.job_url).hostname.replace('www.', '')
        return `Job at ${hostname}`
      } catch {
        return 'Job Evaluation'
      }
    }

    return 'Job Evaluation'
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getParsedEvaluationResult = (evaluation: EvaluationHistoryItem) => {
    if (!evaluation) {
      console.error('No evaluation provided')
      return null
    }

    if (!evaluation.evaluation_result) {
      console.error('Evaluation has no evaluation_result:', evaluation.id)
      return null
    }

    try {
      const result = typeof evaluation.evaluation_result === 'string'
        ? JSON.parse(evaluation.evaluation_result)
        : evaluation.evaluation_result

      console.log('Parsed evaluation result for ID', evaluation.id, ':', result)
      return result
    } catch (error) {
      console.error('Error parsing evaluation result for ID', evaluation.id, ':', error)
      showToast('error', 'Failed to parse evaluation data')
      return null
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation history...</p>
        </div>
      </div>
    )
  }

  if (evaluationHistory.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gray-900 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-800 rounded transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <h1 className="text-xl font-bold text-white">Evaluation History</h1>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Completed Evaluations</h2>
          <p className="text-gray-600 mb-2">
            You haven't completed any ATS evaluations yet.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Evaluations appear here only after they have been fully processed and scored.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={onBack || (() => router.push('/'))}
          >
            Run Your First Evaluation
          </Button>
        </div>
      </div>
    )
  }

  const evaluationResult = selectedEvaluation ? getParsedEvaluationResult(selectedEvaluation) : null

  console.log('History Page State:', {
    totalEvaluations: evaluationHistory.length,
    selectedEvaluationId: selectedEvaluation?.id,
    hasEvaluationResult: !!evaluationResult,
    selectedEvaluation: selectedEvaluation ? {
      id: selectedEvaluation.id,
      hasResult: !!selectedEvaluation.evaluation_result,
      hasJobDesc: !!selectedEvaluation.job_description_text,
      hasResume: !!selectedEvaluation.resume_text,
      hasCoverLetter: !!selectedEvaluation.cover_letter_text
    } : null
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-800 rounded transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <h1 className="text-xl font-bold text-white">Evaluation History</h1>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={handleNewEvaluation}
            >
              New Evaluation
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex">
        {/* Sidebar - Evaluation History */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen sticky top-16 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-bold text-white text-sm">
              {evaluationHistory.length} Evaluation{evaluationHistory.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="divide-y divide-gray-800">
            {evaluationHistory.map((evaluation) => (
              <div
                key={evaluation.id}
                className={`relative group ${selectedEvaluation?.id === evaluation.id
                  ? 'bg-gray-800 border-l-4 border-l-blue-500'
                  : 'hover:bg-gray-800/50'
                  } transition-colors`}
              >
                {editingId === evaluation.id ? (
                  // Rename Mode
                  <div className="p-4">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(evaluation.id, editingName)
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setEditingName('')
                        }
                      }}
                      className="w-full px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleRename(evaluation.id, editingName)}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal Mode
                  <div className="flex items-start">
                    <button
                      onClick={() => handleSelectEvaluation(evaluation)}
                      className="flex-1 text-left p-4"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(evaluation.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-white mb-2 line-clamp-2">
                        {evaluation.custom_name || getDefaultName(evaluation)}
                      </div>
                      {evaluation.overall_score && (
                        <div className="flex items-center gap-2">
                          <div className={`text-xs font-bold ${evaluation.overall_score >= 8 ? 'text-green-400' :
                            evaluation.overall_score >= 6 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                            {evaluation.overall_score.toFixed(1)}/10
                          </div>
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${evaluation.overall_score >= 8 ? 'bg-green-500' :
                                evaluation.overall_score >= 6 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                              style={{ width: `${(evaluation.overall_score / 10) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </button>

                    {/* Menu Button */}
                    <div className="relative" ref={menuOpenId === evaluation.id ? menuRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === evaluation.id ? null : evaluation.id)
                        }}
                        className="p-2 m-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {menuOpenId === evaluation.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                          <button
                            onClick={() => handleApply(evaluation)}
                            className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-gray-700 flex items-center gap-2 rounded-t-lg"
                          >
                            <RefreshCw className="w-4 h-4" /> Apply
                          </button>
                          <button
                            onClick={() => startRename(evaluation)}
                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Pencil className="w-4 h-4" /> Rename
                          </button>
                          <button
                            onClick={() => handleDelete(evaluation.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2 rounded-b-lg"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 w-full px-12 py-6 transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}>
          {selectedEvaluation && evaluationResult ? (
            <ATSResultsView
              evaluationResult={evaluationResult}
              summarizedJD={selectedEvaluation.job_description_text || ''}
              parsedResume={selectedEvaluation.resume_text || ''}
              parsedCoverLetter={selectedEvaluation.cover_letter_text || ''}
              onNewEvaluation={handleNewEvaluation}
            />
          ) : selectedEvaluation && !evaluationResult ? (
            <div className="bg-white border border-gray-300 rounded-lg p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-900 font-medium mb-2">Loading evaluation data...</p>
              <p className="text-sm text-gray-600">
                Evaluation ID: {selectedEvaluation.id}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-900 font-medium mb-2">Select an evaluation from the sidebar to view details</p>
              <p className="text-sm text-gray-600">
                {evaluationHistory.length} evaluation{evaluationHistory.length !== 1 ? 's' : ''} available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ATSHistoryPageProps {
  onBack?: () => void
  evaluationId?: string
  onNavigateToEvaluator?: () => void
  onNavigateToTracker?: (prefillData: any, autoOpenModal?: boolean) => void
}

export default function ATSHistoryPage({
  onBack,
  evaluationId,
  onNavigateToEvaluator,
  onNavigateToTracker
}: ATSHistoryPageProps = {}) {
  return (
    <ToastProvider>
      <ATSHistoryPageContent
        onBack={onBack}
        evaluationId={evaluationId}
        onNavigateToEvaluator={onNavigateToEvaluator}
        onNavigateToTracker={onNavigateToTracker}
      />
    </ToastProvider>
  )
}
