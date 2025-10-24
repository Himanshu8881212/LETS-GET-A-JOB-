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
    <div className="min-h-screen bg-white">
      {/* Header with Navigation */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-6">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              LETS GET A JOB!!!
            </h1>

            {/* Navigation Tabs */}
            <nav className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'home'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('resume')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'resume'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Resume Builder
              </button>
              <button
                onClick={() => setActiveTab('cover')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'cover'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Cover Letter
              </button>
              <button
                onClick={() => setActiveTab('ai-evaluator')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ai-evaluator'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                AI Evaluator
              </button>
              <button
                onClick={() => setActiveTab('tracker')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'tracker'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Job Tracker
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">

        {/* Vertical Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Resume Card */}
          <div
            onClick={() => setActiveTab('resume')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-8 cursor-pointer transition-all hover:shadow-lg"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                Resume Builder
              </h3>

              <p className="text-gray-600 text-sm">
                Build ATS-compatible resumes with version control
              </p>
            </div>
          </div>

          {/* Cover Letter Card */}
          <div
            onClick={() => setActiveTab('cover')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-8 cursor-pointer transition-all hover:shadow-lg"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                Cover Letter Builder
              </h3>

              <p className="text-gray-600 text-sm">
                Create professional cover letters with version control
              </p>
            </div>
          </div>

          {/* AI ATS Evaluator Card */}
          <div
            onClick={() => setActiveTab('ai-evaluator')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-8 cursor-pointer transition-all hover:shadow-lg"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                AI ATS Evaluator
              </h3>

              <p className="text-gray-600 text-sm">
                Get AI-powered feedback on your resume and cover letter
              </p>
            </div>
          </div>

          {/* Job Tracker Card */}
          <div
            onClick={() => setActiveTab('tracker')}
            className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-8 cursor-pointer transition-all hover:shadow-lg"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                Job Tracker
              </h3>

              <p className="text-gray-600 text-sm">
                Track applications with kanban board and analytics
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

