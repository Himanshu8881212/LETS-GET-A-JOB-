'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Upload, FileText, Mail, Link as LinkIcon, Sparkles, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus, Loader2, History } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useToast } from './ui/Toast'
import ATSResultsView from './ATSResultsView'

interface AIATSEvaluatorProps {
  onBack: () => void
  onNavigateToHistory?: (evaluationId?: number) => void
}

interface ResumeVersion {
  id: number
  version_name: string
  version_number: string
  branch_name: string
}

interface CoverLetterVersion {
  id: number
  version_name: string
}

interface EvaluationResponse {
  summary: string
  overall: {
    weighted_score: number
    weights: {
      role_fit: number
      skills_keywords: number
      impact_evidence: number
      ats_compliance: number
      cover_letter: number
    }
    rationale: string
  }
  scores: {
    role_fit: {
      score: number
      evidence_found: string[]
      gaps: string[]
      fixes: string[]
    }
    skills_keywords: {
      score: number
      present: string[]
      missing: string[]
      fixes: string[]
    }
    impact_evidence: {
      score: number
      issues: string[]
      example_rewrites: string[]
    }
    ats_compliance: {
      score: number
      problems: string[]
      fixes: string[]
    }
    cover_letter: {
      score: number
      critique: string[]
      fixes: string[]
    }
  }
  missing_keywords: {
    must_have: string[]
    should_have: string[]
    nice_to_have: string[]
  }
  top_fixes: Array<{
    area: string
    action: string
    why: string
    example: string
  }>
  keyword_occurrences: Array<{
    term: string
    in_resume: number
    in_cover_letter: number
    in_job_description: number
  }>
  risk_flags: string[]
  source: {
    job_description_id: string
    resume_id: string
    cover_letter_id: string
  }
}

// Inspirational quotes for loading overlay
const LOADING_QUOTES = [
  "Analyzing your career story...",
  "Matching your skills with opportunity...",
  "Crafting the perfect narrative...",
  "Every great career starts with a great application...",
  "Your next opportunity is being evaluated...",
  "Optimizing for success...",
  "Finding the perfect fit...",
  "Your potential is being measured...",
  "Building your competitive edge...",
  "Transforming experience into opportunity..."
]

// Professional loading overlay with step indicators
const LoadingOverlay = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const [quoteIndex, setQuoteIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LOADING_QUOTES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const steps = [
    { number: 1, label: 'Processing Job Description' },
    { number: 2, label: 'Analyzing Resume' },
    { number: 3, label: 'Reviewing Cover Letter' },
    { number: 4, label: 'Running AI Evaluation' }
  ]

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full mx-4 border border-gray-200">
        <div className="flex flex-col items-center space-y-8">
          {/* Animated spinner with pulse effect */}
          <div className="relative">
            <div className="w-20 h-20 relative">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-gray-900 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gray-900 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="w-full space-y-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${currentStep === step.number
                  ? 'bg-gray-900 text-white shadow-lg scale-105'
                  : currentStep > step.number
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-white text-gray-400 border border-gray-200'
                  }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentStep === step.number
                    ? 'bg-white text-gray-900'
                    : currentStep > step.number
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-400'
                    }`}
                >
                  {currentStep > step.number ? '✓' : step.number}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{step.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-full">
            <div className="flex justify-between text-sm font-medium text-gray-600 mb-3">
              <span>Overall Progress</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-gray-700 to-gray-900 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Inspirational quote */}
          <div className="text-center">
            <p className="text-gray-700 font-medium text-lg animate-pulse min-h-[3rem] flex items-center justify-center">
              {LOADING_QUOTES[quoteIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AIATSEvaluator({ onBack, onNavigateToHistory }: AIATSEvaluatorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  // Input states
  const [resumeSource, setResumeSource] = useState<'lineage' | 'upload'>('lineage')
  const [coverLetterSource, setCoverLetterSource] = useState<'lineage' | 'upload'>('lineage')
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<number | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [jobUrl, setJobUrl] = useState('')

  // Data states
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([])
  const [coverLetterVersions, setCoverLetterVersions] = useState<CoverLetterVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const totalSteps = 4 // JD, Resume, Cover Letter, Evaluation

  // Results states
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResponse | null>(null)
  const [parsedResume, setParsedResume] = useState<string>('')
  const [parsedCoverLetter, setParsedCoverLetter] = useState<string>('')
  const [summarizedJD, setSummarizedJD] = useState<string>('')
  const [rawJD, setRawJD] = useState<string>('')
  const [currentEvaluationId, setCurrentEvaluationId] = useState<number | null>(null)

  // Load resume and cover letter versions
  useEffect(() => {
    loadVersions()
  }, [])

  const loadVersions = async () => {
    setIsLoading(true)
    try {
      // Load resume versions
      const resumeRes = await fetch('/api/resumes')
      if (resumeRes.ok) {
        const data = await resumeRes.json()
        // API returns array directly, not wrapped in { versions: [] }
        const versions = Array.isArray(data) ? data : []
        setResumeVersions(versions)
      } else {
        console.error('❌ Resume API failed:', resumeRes.status, resumeRes.statusText)
      }

      // Load cover letter versions
      const coverRes = await fetch('/api/cover-letters')
      if (coverRes.ok) {
        const data = await coverRes.json()
        // API returns array directly, not wrapped in { versions: [] }
        const versions = Array.isArray(data) ? data : []
        setCoverLetterVersions(versions)
      } else {
        console.error('❌ Cover Letter API failed:', coverRes.status, coverRes.statusText)
      }
    } catch (error) {
      console.error('Error loading versions:', error)
      showToast('error', 'Failed to load versions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setResumeFile(file)
    } else {
      showToast('error', 'Please select a PDF file')
    }
  }

  const handleCoverLetterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setCoverLetterFile(file)
    } else {
      showToast('error', 'Please select a PDF file')
    }
  }

  const handleEvaluate = async () => {
    // Validation
    if (resumeSource === 'lineage' && !selectedResumeId) {
      showToast('error', 'Please select a resume version')
      return
    }
    if (resumeSource === 'upload' && !resumeFile) {
      showToast('error', 'Please upload a resume')
      return
    }
    if (coverLetterSource === 'lineage' && !selectedCoverLetterId) {
      showToast('error', 'Please select a cover letter version')
      return
    }
    if (coverLetterSource === 'upload' && !coverLetterFile) {
      showToast('error', 'Please upload a cover letter')
      return
    }
    if (!jobUrl.trim()) {
      showToast('error', 'Please enter a job URL')
      return
    }

    // Reset states
    setEvaluationResult(null)
    setIsEvaluating(true)
    setCurrentStep(0)

    try {
      // Step 1: Process Job Description
      setCurrentStep(1)
      showToast('info', 'Processing job description...')

      // Fetch job description from URL via n8n
      const jdResponse = await fetch('/api/n8n/process-jd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobUrl }),
      })

      if (!jdResponse.ok) {
        throw new Error('Failed to process job description')
      }

      const jdData = await jdResponse.json()
      const summarizedJDText = jdData.output || jdData.summarizedJD || jdData.summary || jdData.text
      const rawJDText = jdData.rawJD || jdData.raw || ''

      // Store JD results
      setSummarizedJD(summarizedJDText)
      setRawJD(rawJDText)

      // Step 2: Process Resume
      setCurrentStep(2)
      showToast('info', 'Processing resume...')
      let resumePdfBlob: Blob

      if (resumeSource === 'lineage') {
        // Fetch resume PDF from API
        const resumePdfResponse = await fetch(`/api/resumes/${selectedResumeId}/download`)
        if (!resumePdfResponse.ok) {
          throw new Error('Failed to fetch resume PDF')
        }
        resumePdfBlob = await resumePdfResponse.blob()
      } else {
        resumePdfBlob = resumeFile!
      }

      const resumeFormData = new FormData()
      resumeFormData.append('data', resumePdfBlob, 'resume.pdf')

      const resumeResponse = await fetch('/api/n8n/process-resume', {
        method: 'POST',
        body: resumeFormData,
      })

      if (!resumeResponse.ok) {
        throw new Error('Failed to process resume')
      }

      const resumeData = await resumeResponse.json()
      const parsedResumeText = resumeData.output || resumeData.parsedResume || resumeData.parsed || resumeData.text
      const summarizedResumeText = resumeData.summarizedResume || resumeData.summary || parsedResumeText

      // Store resume results
      setParsedResume(parsedResumeText)

      // Step 3: Process Cover Letter
      setCurrentStep(3)
      showToast('info', 'Processing cover letter...')
      let coverLetterPdfBlob: Blob

      if (coverLetterSource === 'lineage') {
        // Fetch cover letter PDF from API
        const coverLetterPdfResponse = await fetch(`/api/cover-letters/${selectedCoverLetterId}/download`)
        if (!coverLetterPdfResponse.ok) {
          throw new Error('Failed to fetch cover letter PDF')
        }
        coverLetterPdfBlob = await coverLetterPdfResponse.blob()
      } else {
        coverLetterPdfBlob = coverLetterFile!
      }

      const coverLetterFormData = new FormData()
      coverLetterFormData.append('data', coverLetterPdfBlob, 'cover-letter.pdf')

      const coverLetterResponse = await fetch('/api/n8n/process-cover-letter', {
        method: 'POST',
        body: coverLetterFormData,
      })

      if (!coverLetterResponse.ok) {
        throw new Error('Failed to process cover letter')
      }

      const coverLetterData = await coverLetterResponse.json()
      const parsedCoverLetterText = coverLetterData.output || coverLetterData.parsedCoverLetter || coverLetterData.parsed || coverLetterData.text
      const summarizedCoverLetterText = coverLetterData.summarizedCoverLetter || coverLetterData.summary || parsedCoverLetterText

      // Store cover letter results
      setParsedCoverLetter(parsedCoverLetterText)

      // Step 4: Run Final Evaluation
      setCurrentStep(4)
      showToast('info', 'Running AI evaluation...')

      const saveResponse = await fetch('/api/ats-evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_url: jobUrl,
          job_description_text: summarizedJDText,
          resume_text: summarizedResumeText,
          cover_letter_text: summarizedCoverLetterText,
          resume_version_id: resumeSource === 'lineage' ? selectedResumeId : null,
          cover_letter_version_id: coverLetterSource === 'lineage' ? selectedCoverLetterId : null,
        }),
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save evaluation data')
      }

      const saveData = await saveResponse.json()
      const evaluationId = saveData.evaluation_id

      const evaluationResponse = await fetch('/api/n8n/evaluate-ats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_description: summarizedJDText,
          resume_text: summarizedResumeText,
          cover_letter_text: summarizedCoverLetterText,
        }),
      })

      if (!evaluationResponse.ok) {
        throw new Error('Evaluation failed')
      }

      const evaluationData = await evaluationResponse.json()

      // Extract the actual evaluation result (n8n returns {output: {...}})
      const actualEvaluationResult = evaluationData.output || evaluationData

      // Step 6: Update database with evaluation results
      const overallScore = actualEvaluationResult.overall?.weighted_score || 0

      await fetch('/api/ats-evaluations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluation_id: evaluationId,
          evaluation_result: actualEvaluationResult,
          overall_score: overallScore,
        }),
      })

      // Set evaluation results (use the extracted result, not the wrapper)
      setEvaluationResult(actualEvaluationResult)
      setCurrentEvaluationId(evaluationId)

      showToast('success', 'Evaluation completed successfully!')

      // Redirect to history page with the new evaluation
      setTimeout(() => {
        if (onNavigateToHistory) {
          onNavigateToHistory(evaluationId)
        } else {
          router.push(`/?tab=ats-history&id=${evaluationId}`)
        }
      }, 1000)
    } catch (error) {
      console.error('Evaluation error:', error)
      showToast('error', error instanceof Error ? error.message : 'Failed to evaluate. Please try again.')
    } finally {
      setIsEvaluating(false)
      setCurrentStep(0)
    }
  }

  const handleNewEvaluation = () => {
    setEvaluationResult(null)
    setCurrentEvaluationId(null)
    setParsedResume('')
    setParsedCoverLetter('')
    setSummarizedJD('')
    setRawJD('')
  }

  const getScoreColor = (score: number) => {
    // Score is out of 10
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    // Score is out of 10
    if (score >= 8) return 'border-l-4 border-l-green-500'
    if (score >= 6) return 'border-l-4 border-l-yellow-500'
    return 'border-l-4 border-l-red-500'
  }

  const ScoreIndicator = ({ score }: { score: number }) => {
    // Score is out of 10
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Overlay */}
      {isEvaluating && <LoadingOverlay currentStep={currentStep} totalSteps={totalSteps} />}

      {/* Header */}
      <div className="bg-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-white" />
                <h1 className="text-xl font-bold text-white">
                  AI ATS Evaluator
                </h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                if (onNavigateToHistory) {
                  onNavigateToHistory()
                } else {
                  router.push('/?tab=ats-history')
                }
              }}
              icon={<History className="w-4 h-4" />}
            >
              History
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {!evaluationResult ? (
          // Input Form
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">How it works</h3>
                  <p className="text-sm text-blue-800">
                    Upload or select your resume and cover letter, provide the job URL, and our AI will analyze your application against the job requirements, providing detailed feedback and improvement suggestions.
                  </p>
                </div>
              </div>
            </div>

            {/* Resume Selection */}
            <div className="bg-white border border-gray-300">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-900" />
                  <h2 className="text-lg font-bold text-gray-900">Resume</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Source Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setResumeSource('lineage')}
                    className={`flex-1 px-4 py-2 text-sm font-semibold border transition-colors ${resumeSource === 'lineage'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                      }`}
                  >
                    Select from Lineage
                  </button>
                  <button
                    onClick={() => setResumeSource('upload')}
                    className={`flex-1 px-4 py-2 text-sm font-semibold border transition-colors ${resumeSource === 'upload'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                      }`}
                  >
                    Upload PDF
                  </button>
                </div>

                {resumeSource === 'lineage' ? (
                  <select
                    value={selectedResumeId || ''}
                    onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 border border-gray-900 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">Select a resume version</option>
                    {resumeVersions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.version_name} ({version.version_number} - {version.branch_name})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 hover:border-gray-900 transition-colors p-8 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleResumeFileChange}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        {resumeFile ? resumeFile.name : 'Click to upload resume PDF'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF files only</p>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Letter Selection */}
            <div className="bg-white border border-gray-300">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-900" />
                  <h2 className="text-lg font-bold text-gray-900">Cover Letter</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Source Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCoverLetterSource('lineage')}
                    className={`flex-1 px-4 py-2 text-sm font-semibold border transition-colors ${coverLetterSource === 'lineage'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                      }`}
                  >
                    Select from Lineage
                  </button>
                  <button
                    onClick={() => setCoverLetterSource('upload')}
                    className={`flex-1 px-4 py-2 text-sm font-semibold border transition-colors ${coverLetterSource === 'upload'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                      }`}
                  >
                    Upload PDF
                  </button>
                </div>

                {coverLetterSource === 'lineage' ? (
                  <select
                    value={selectedCoverLetterId || ''}
                    onChange={(e) => setSelectedCoverLetterId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 border border-gray-900 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">Select a cover letter version</option>
                    {coverLetterVersions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.version_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 hover:border-gray-900 transition-colors p-8 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleCoverLetterFileChange}
                      className="hidden"
                      id="cover-letter-upload"
                    />
                    <label htmlFor="cover-letter-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        {coverLetterFile ? coverLetterFile.name : 'Click to upload cover letter PDF'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF files only</p>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Job URL */}
            <div className="bg-white border border-gray-300">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-gray-900" />
                  <h2 className="text-lg font-bold text-gray-900">Job Posting URL</h2>
                </div>
              </div>
              <div className="p-6">
                <Input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://example.com/job-posting"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the URL of the job posting you're applying to
                </p>
              </div>
            </div>

            {/* Evaluate Button */}
            <div className="flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleEvaluate}
                loading={isEvaluating}
                disabled={isEvaluating}
                icon={<Sparkles className="w-5 h-5" />}
                className="px-12"
              >
                Evaluate with AI
              </Button>
            </div>
          </div>
        ) : (
          // Evaluation Results
          <ATSResultsView
            evaluationResult={evaluationResult}
            summarizedJD={summarizedJD}
            parsedResume={parsedResume}
            parsedCoverLetter={parsedCoverLetter}
            onNewEvaluation={handleNewEvaluation}
          />
        )}
      </div>
    </div>
  )
}
