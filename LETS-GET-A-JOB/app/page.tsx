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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header - Professional Design */}
      <div className="bg-black shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-6xl font-extrabold text-white tracking-tight mb-3 leading-tight">
              LETS GET A JOB
            </h1>
            <p className="text-gray-300 text-xl font-light">
              Enterprise-Grade Career Document Platform
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-5 tracking-tight">
            Professional Document Suite
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
            Create ATS-optimized resumes, cover letters, and track your job applications with our comprehensive career management platform
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Resume Card */}
          <div
            onClick={() => setActiveTab('resume')}
            className="group relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-2xl p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 overflow-hidden"
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Resume Builder
              </h3>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Create professional resumes with 12+ customizable sections and intelligent formatting
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Drag-and-drop section ordering</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Custom skill categories</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Version control & branching</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Auto-save & validation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter Card */}
          <div
            onClick={() => setActiveTab('cover')}
            className="group relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-2xl p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 overflow-hidden"
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Cover Letter Builder
              </h3>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Craft compelling cover letters with customizable paragraphs and professional formatting
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>1-5 customizable paragraphs</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Matches resume design</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Version control & branching</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Professional LaTeX output</span>
                </div>
              </div>
            </div>
          </div>

          {/* Job Tracker Card */}
          <div
            onClick={() => setActiveTab('tracker')}
            className="group relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-2xl p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 overflow-hidden"
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Job Tracker
              </h3>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage applications with a visual kanban board and track your job search progress
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Kanban-style workflow</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Drag-and-drop status updates</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Application analytics</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full flex-shrink-0"></div>
                  <span>Resume version tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 pt-16 border-t border-gray-200">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              Enterprise Features
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Built with modern technologies for professional results
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">ATS-Optimized</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Documents formatted to pass Applicant Tracking Systems with high compatibility scores
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Version Control</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Git-like branching system to manage multiple versions and track changes over time
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Professional Output</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                LaTeX-powered PDF generation ensures consistent, high-quality professional documents
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-20 pt-12 border-t border-gray-200 pb-8">
          <p className="text-gray-500 text-sm font-medium">
            Built with Next.js, React, and LaTeX
          </p>
          <p className="text-gray-400 text-xs mt-2">
            ATS-Compatible • Version Control • Professional Formatting
          </p>
        </div>
      </div>
    </div>
  )
}

