'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FileText, Mail, BarChart3, ChevronRight } from 'lucide-react'
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'resume' | 'cover' | 'tracker'>('home')

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

  if (activeTab === 'tracker') {
    // Redirect to tracker page
    if (typeof window !== 'undefined') {
      window.location.href = '/tracker'
    }
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            LETS GET A JOB!!!
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* Main Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Resume Card */}
          <div
            onClick={() => setActiveTab('resume')}
            className="group bg-white border border-gray-300 hover:border-gray-900 p-8 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-gray-900 rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Resume Builder
            </h3>

            <p className="text-gray-600 text-sm">
              Build ATS-compatible resumes with version control
            </p>
          </div>

          {/* Cover Letter Card */}
          <div
            onClick={() => setActiveTab('cover')}
            className="group bg-white border border-gray-300 hover:border-gray-900 p-8 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-gray-900 rounded flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Cover Letter Builder
            </h3>

            <p className="text-gray-600 text-sm">
              Create professional cover letters with version control
            </p>
          </div>

          {/* Job Tracker Card */}
          <div
            onClick={() => setActiveTab('tracker')}
            className="group bg-white border border-gray-300 hover:border-gray-900 p-8 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-gray-900 rounded flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Job Tracker
            </h3>

            <p className="text-gray-600 text-sm">
              Track applications with kanban board and analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

