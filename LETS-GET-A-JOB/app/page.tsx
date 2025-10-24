'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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

export default function Home() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'home' | 'resume' | 'cover' | 'tracker' | 'ai-evaluator'>('home')

  // Check for tab query parameter on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'ai-evaluator' || tab === 'resume' || tab === 'cover' || tab === 'tracker') {
      setActiveTab(tab)
    }
  }, [searchParams])

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
        <AIATSEvaluator onBack={() => setActiveTab('home')} />
      </ToastProvider>
    )
  }

  if (activeTab === 'tracker') {
    // Redirect to tracker page
    if (typeof window !== 'undefined') {
      window.location.href = '/tracker'
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            LETS GET A JOB!!!
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Resume Card */}
          <div
            onClick={() => setActiveTab('resume')}
            className="group bg-gray-800 border border-gray-700 hover:border-gray-500 p-8 cursor-pointer transition-all hover:bg-gray-750"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-900" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Resume Builder
            </h3>

            <p className="text-gray-400 text-sm">
              Build ATS-compatible resumes with version control
            </p>
          </div>

          {/* Cover Letter Card */}
          <div
            onClick={() => setActiveTab('cover')}
            className="group bg-gray-800 border border-gray-700 hover:border-gray-500 p-8 cursor-pointer transition-all hover:bg-gray-750"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-900" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Cover Letter Builder
            </h3>

            <p className="text-gray-400 text-sm">
              Create professional cover letters with version control
            </p>
          </div>

          {/* AI ATS Evaluator Card */}
          <div
            onClick={() => setActiveTab('ai-evaluator')}
            className="group bg-gray-800 border border-gray-700 hover:border-gray-500 p-8 cursor-pointer transition-all hover:bg-gray-750"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-gray-900" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              AI ATS Evaluator
            </h3>

            <p className="text-gray-400 text-sm">
              Get AI-powered feedback on your resume and cover letter
            </p>
          </div>

          {/* Job Tracker Card */}
          <div
            onClick={() => setActiveTab('tracker')}
            className="group bg-gray-800 border border-gray-700 hover:border-gray-500 p-8 cursor-pointer transition-all hover:bg-gray-750"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-900" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Job Tracker
            </h3>

            <p className="text-gray-400 text-sm">
              Track applications with kanban board and analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

