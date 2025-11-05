'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FileText, Mail, BarChart3, ChevronRight, Sparkles, Eye, Download, Clock } from 'lucide-react'
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

interface RecentDocument {
  id: number
  version_name: string
  version_number: string
  branch_name: string
  created_at: string
  data_json?: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'resume' | 'cover' | 'tracker' | 'ai-evaluator' | 'ats-history'>('home')
  const [atsHistoryId, setAtsHistoryId] = useState<string | undefined>(undefined)
  const [trackerPrefillData, setTrackerPrefillData] = useState<any>(null)
  const [trackerAutoOpenModal, setTrackerAutoOpenModal] = useState(false)
  const [recentResumes, setRecentResumes] = useState<RecentDocument[]>([])
  const [recentCoverLetters, setRecentCoverLetters] = useState<RecentDocument[]>([])
  const [isLoadingResumes, setIsLoadingResumes] = useState(true)
  const [isLoadingCoverLetters, setIsLoadingCoverLetters] = useState(true)

  // Fetch recent resumes and cover letters
  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        // Fetch resumes
        const resumesResponse = await fetch('/api/resumes')
        if (resumesResponse.ok) {
          const allResumes = await resumesResponse.json()
          // Sort by created_at descending and take top 5
          const sorted = allResumes.sort((a: RecentDocument, b: RecentDocument) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setRecentResumes(sorted.slice(0, 5))
        }
      } catch (error) {
        console.error('Error fetching recent resumes:', error)
      } finally {
        setIsLoadingResumes(false)
      }

      try {
        // Fetch cover letters
        const coverLettersResponse = await fetch('/api/cover-letters')
        if (coverLettersResponse.ok) {
          const allCoverLetters = await coverLettersResponse.json()
          // Sort by created_at descending and take top 5
          const sorted = allCoverLetters.sort((a: RecentDocument, b: RecentDocument) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setRecentCoverLetters(sorted.slice(0, 5))
        }
      } catch (error) {
        console.error('Error fetching recent cover letters:', error)
      } finally {
        setIsLoadingCoverLetters(false)
      }
    }

    if (activeTab === 'home') {
      fetchRecentDocuments()
    }
  }, [activeTab])

  const handlePreviewResume = async (resume: RecentDocument) => {
    try {
      // Parse the data_json field which contains the resume data
      const resumeData = resume.data_json ? JSON.parse(resume.data_json) : {}

      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Error previewing resume:', error)
      alert('Failed to preview resume. Please try again.')
    }
  }

  const handleDownloadResume = async (resume: RecentDocument) => {
    try {
      // Parse the data_json field which contains the resume data
      const resumeData = resume.data_json ? JSON.parse(resume.data_json) : {}

      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${resume.version_name.toLowerCase().replace(/\s+/g, '-')}-${resume.version_number}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading resume:', error)
      alert('Failed to download resume. Please try again.')
    }
  }

  const handlePreviewCoverLetter = async (coverLetter: RecentDocument) => {
    try {
      // Parse the data_json field which contains the cover letter data
      const coverLetterData = coverLetter.data_json ? JSON.parse(coverLetter.data_json) : {}

      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coverLetterData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Error previewing cover letter:', error)
      alert('Failed to preview cover letter. Please try again.')
    }
  }

  const handleDownloadCoverLetter = async (coverLetter: RecentDocument) => {
    try {
      // Parse the data_json field which contains the cover letter data
      const coverLetterData = coverLetter.data_json ? JSON.parse(coverLetter.data_json) : {}

      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coverLetterData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${coverLetter.version_name.toLowerCase().replace(/\s+/g, '-')}-${coverLetter.version_number}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading cover letter:', error)
      alert('Failed to download cover letter. Please try again.')
    }
  }

  const handleViewSampleResume = () => {
    // Only preview, don't download
    window.open('/samples/sample-resume.pdf', '_blank')
  }

  const handleViewSampleCoverLetter = () => {
    // Only preview, don't download
    window.open('/samples/sample-cover-letter.pdf', '_blank')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

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

        {/* Sample Documents Section */}
        <div className="mt-16 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Need Inspiration?</h2>
            <p className="text-gray-600 text-lg">Check out our sample documents to see what you can create</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              onClick={handleViewSampleResume}
              className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-8 rounded-lg transition-all hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Sample Resume</h3>
                    <p className="text-sm text-gray-600">See a professional resume example</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-900 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={handleViewSampleCoverLetter}
              className="group bg-white border-2 border-gray-200 hover:border-gray-900 p-8 rounded-lg transition-all hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Mail className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Sample Cover Letter</h3>
                    <p className="text-sm text-gray-600">See a professional cover letter example</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-900 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Recent Documents Section */}
        <div className="mt-16 space-y-12">
          {/* Recent Resumes */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-gray-600" />
                <h2 className="text-2xl font-bold text-gray-900">Recent Resumes</h2>
              </div>
              {recentResumes.length > 0 && (
                <button
                  onClick={() => setActiveTab('resume')}
                  className="text-sm text-gray-900 hover:text-gray-700 font-medium flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {isLoadingResumes ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading resumes...</p>
              </div>
            ) : recentResumes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No resumes yet</p>
                <button
                  onClick={() => setActiveTab('resume')}
                  className="text-gray-900 hover:text-gray-700 font-medium"
                >
                  Create your first resume →
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resume Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Modified
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentResumes.map((resume) => (
                      <tr key={resume.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{resume.version_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                            {resume.version_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {resume.branch_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(resume.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreviewResume(resume)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownloadResume(resume)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-gray-900 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Cover Letters */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-gray-600" />
                <h2 className="text-2xl font-bold text-gray-900">Recent Cover Letters</h2>
              </div>
              {recentCoverLetters.length > 0 && (
                <button
                  onClick={() => setActiveTab('cover')}
                  className="text-sm text-gray-900 hover:text-gray-700 font-medium flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {isLoadingCoverLetters ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading cover letters...</p>
              </div>
            ) : recentCoverLetters.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No cover letters yet</p>
                <button
                  onClick={() => setActiveTab('cover')}
                  className="text-gray-900 hover:text-gray-700 font-medium"
                >
                  Create your first cover letter →
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cover Letter Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Modified
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentCoverLetters.map((coverLetter) => (
                      <tr key={coverLetter.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{coverLetter.version_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                            {coverLetter.version_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {coverLetter.branch_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(coverLetter.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreviewCoverLetter(coverLetter)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownloadCoverLetter(coverLetter)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-gray-900 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

