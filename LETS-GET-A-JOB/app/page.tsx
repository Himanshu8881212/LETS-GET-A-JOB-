'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FileText, Mail, BarChart3, ChevronRight, Sparkles } from 'lucide-react'
import { ToastProvider } from '@/components/ui/Toast'

// Lazy load heavy components
const EnhancedResumeBuilder = dynamic(
  () => import('@/components/EnhancedResumeBuilder'),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Resume Builder...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

const ImprovedCoverLetterBuilder = dynamic(
  () => import('@/components/ImprovedCoverLetterBuilder'),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Cover Letter Builder...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

const AIATSEvaluator = dynamic(
  () => import('@/components/AIATSEvaluator'),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI ATS Evaluator...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

const JobTrackerPage = dynamic(
  () => import('@/components/JobTrackerPage'),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Job Tracker...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

const ATSHistoryPage = dynamic(
  () => import('@/components/ATSHistoryPage'),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ATS History...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'resume' | 'cover' | 'tracker' | 'ai-evaluator' | 'ats-history'>('home')
  const [atsHistoryId, setAtsHistoryId] = useState<string | undefined>(undefined)
  const [trackerPrefillData, setTrackerPrefillData] = useState<any>(null)
  const [trackerAutoOpenModal, setTrackerAutoOpenModal] = useState(false)

  if (activeTab === 'resume') {
    return (
      <ToastProvider>
        <EnhancedResumeBuilder onBack={() => setActiveTab('home')} />
      </ToastProvider>
    )
  }

  if (activeTab === 'cover') {
    return (
      <ToastProvider>
        <ImprovedCoverLetterBuilder onBack={() => setActiveTab('home')} />
      </ToastProvider>
    )
  }

  if (activeTab === 'ai-evaluator') {
    return (
      <ToastProvider>
        <AIATSEvaluator
          onBack={() => setActiveTab('home')}
          onNavigateToHistory={(evaluationId) => {
            if (evaluationId) {
              setAtsHistoryId(String(evaluationId))
            }
            setActiveTab('ats-history')
          }}
        />
      </ToastProvider>
    )
  }

  if (activeTab === 'tracker') {
    return (
      <ToastProvider>
        <JobTrackerPage
          onBack={() => setActiveTab('home')}
          prefillData={trackerPrefillData}
          autoOpenModal={trackerAutoOpenModal}
        />
      </ToastProvider>
    )
  }

  if (activeTab === 'ats-history') {
    return (
      <ToastProvider>
        <ATSHistoryPage
          onBack={() => setActiveTab('home')}
          evaluationId={atsHistoryId}
          onNavigateToEvaluator={() => setActiveTab('ai-evaluator')}
          onNavigateToTracker={(prefillData, autoOpenModal = false) => {
            setTrackerPrefillData(prefillData)
            setTrackerAutoOpenModal(autoOpenModal)
            setActiveTab('tracker')
          }}
        />
      </ToastProvider>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            LETS GET A JOB!!!
          </h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* Vertical Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Resume Card */}
          <div
            onClick={() => setActiveTab('resume')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-12 cursor-pointer transition-all hover:shadow-xl rounded-lg"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-gray-900 rounded-xl flex items-center justify-center">
                <FileText className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900">
                Resume Builder
              </h3>

              <p className="text-gray-600 text-base">
                Build ATS-compatible resumes with version control
              </p>
            </div>
          </div>

          {/* Cover Letter Card */}
          <div
            onClick={() => setActiveTab('cover')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-12 cursor-pointer transition-all hover:shadow-xl rounded-lg"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-gray-900 rounded-xl flex items-center justify-center">
                <Mail className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900">
                Cover Letter Builder
              </h3>

              <p className="text-gray-600 text-base">
                Create professional cover letters with version control
              </p>
            </div>
          </div>

          {/* AI ATS Evaluator Card */}
          <div
            onClick={() => setActiveTab('ai-evaluator')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-12 cursor-pointer transition-all hover:shadow-xl rounded-lg"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-gray-900 rounded-xl flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900">
                AI ATS Evaluator
              </h3>

              <p className="text-gray-600 text-base">
                Get AI-powered feedback on your resume and cover letter
              </p>
            </div>
          </div>

          {/* Job Tracker Card */}
          <div
            onClick={() => setActiveTab('tracker')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-12 cursor-pointer transition-all hover:shadow-xl rounded-lg"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-gray-900 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900">
                Job Tracker
              </h3>

              <p className="text-gray-600 text-base">
                Track applications with kanban board and analytics
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

