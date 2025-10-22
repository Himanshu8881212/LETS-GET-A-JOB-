'use client'

import { useState } from 'react'
import { FileText, Mail, BarChart3, ChevronRight, Eye, Download, Sparkles } from 'lucide-react'
import EnhancedResumeBuilder from '@/components/EnhancedResumeBuilder'
import ImprovedCoverLetterBuilder from '@/components/ImprovedCoverLetterBuilder'
import { ToastProvider } from '@/components/ui/Toast'

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
      {/* Header - Black/White/Grey Theme */}
      <div className="bg-black border-b-2 border-gray-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white tracking-tight mb-2">
              LETS GET A JOB
            </h1>
            <p className="text-gray-400 text-lg">
              Professional Resume & Cover Letter Generator
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Choose Your Document
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-lg">
            Create ATS-compatible documents with professional formatting
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Resume Card */}
          <div
            onClick={() => setActiveTab('resume')}
            className="group bg-white rounded-xl border-2 border-gray-900 shadow-lg p-10 cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <ChevronRight className="w-8 h-8 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Resume Builder
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              12+ customizable sections with drag-and-drop ordering
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Drag-and-drop sections</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Custom skill categories</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Auto-save & validation</span>
              </div>
            </div>
          </div>

          {/* Cover Letter Card */}
          <div
            onClick={() => setActiveTab('cover')}
            className="group bg-white rounded-xl border-2 border-gray-900 shadow-lg p-10 cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <ChevronRight className="w-8 h-8 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Cover Letter Builder
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              Professional cover letters with customizable paragraphs
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>1-5 body paragraphs</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Matching resume design</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Professional LaTeX output</span>
              </div>
            </div>
          </div>

          {/* Job Tracker Card */}
          <div
            onClick={() => setActiveTab('tracker')}
            className="group bg-white rounded-xl border-2 border-gray-900 shadow-lg p-10 cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <ChevronRight className="w-8 h-8 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Job Tracker
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              Track applications and analyze resume performance
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Kanban-style board</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Drag-and-drop status</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>Analytics dashboard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="mt-20 pt-16 border-t-2 border-gray-200">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold text-orange-900">Professional Examples</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              See What Great Looks Like
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              View professionally crafted resume and cover letter examples. Use these as inspiration for your own documents.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Demo Resume */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-900 shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Demo Resume</h3>
                  <p className="text-sm text-gray-600">Full Stack Engineer</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>5+ years experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>6 skill categories</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>3 work experiences</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>2 featured projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>Certifications & awards</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.open('/api/demo/resume', '_blank')}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-900 text-black px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = '/api/demo/resume'
                    link.download = 'demo-resume-sarah-chen.pdf'
                    link.click()
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            {/* Demo Cover Letter */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-900 shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Demo Cover Letter</h3>
                  <p className="text-sm text-gray-600">Senior Engineer Role</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>Compelling opening</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>3 strong body paragraphs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>Quantified achievements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>Company-specific details</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <span>Professional closing</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.open('/api/demo/cover-letter', '_blank')}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-900 text-black px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = '/api/demo/cover-letter'
                    link.download = 'demo-cover-letter-sarah-chen.pdf'
                    link.click()
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 italic">
              💡 Tip: Use these examples as templates for your own documents
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pb-8">
          <p className="text-gray-500 text-sm">
            Built with Next.js, React, and LaTeX • ATS-Compatible Documents
          </p>
        </div>
      </div>
    </div>
  )
}

