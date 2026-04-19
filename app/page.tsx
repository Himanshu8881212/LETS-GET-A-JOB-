'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderArchive,
  LayoutGrid,
  Mail,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { AppShell } from '@/components/ui/AppShell'
import { SidebarNav } from '@/components/ui/SidebarNav'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

const EnhancedResumeBuilder = dynamic(() => import('@/components/EnhancedResumeBuilder'), {
  loading: () => <StudioLoader label="Loading Resume Studio…" />,
  ssr: false,
})

const ImprovedCoverLetterBuilder = dynamic(() => import('@/components/ImprovedCoverLetterBuilder'), {
  loading: () => <StudioLoader label="Loading Letter Studio…" />,
  ssr: false,
})

const AIATSEvaluator = dynamic(() => import('@/components/AIATSEvaluator'), {
  loading: () => <StudioLoader label="Loading ATS Studio…" />,
  ssr: false,
})

const JobTrackerPage = dynamic(() => import('@/components/JobTrackerPage'), {
  loading: () => <StudioLoader label="Loading Job Tracker…" />,
  ssr: false,
})

const ATSHistoryPage = dynamic(() => import('@/components/ATSHistoryPage'), {
  loading: () => <StudioLoader label="Loading History…" />,
  ssr: false,
})

const SettingsPage = dynamic(() => import('@/components/SettingsPage'), {
  loading: () => <StudioLoader label="Loading Settings…" />,
  ssr: false,
})

const DocumentsPage = dynamic(() => import('@/components/DocumentsPage'), {
  loading: () => <StudioLoader label="Loading Documents…" />,
  ssr: false,
})

const GuidelinesPage = dynamic(() => import('@/components/GuidelinesPage'), {
  loading: () => <StudioLoader label="Loading Guidelines…" />,
  ssr: false,
})

const MemoryPage = dynamic(() => import('@/components/MemoryPage'), {
  loading: () => <StudioLoader label="Loading Memory…" />,
  ssr: false,
})

const PDFPreviewModal = dynamic(() => import('@/components/PDFPreviewModal'), { ssr: false })

function StudioLoader({ label }: { label: string }) {
  return (
    <div className="flex-1 bg-brand-mist/20 flex flex-col h-full overflow-hidden">
      <div className="h-[72px] px-4 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <h2 className="font-display font-bold text-brand-ink leading-tight">Headhunter</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-12 animate-fade-in">
        <Spinner size="lg" />
        <p className="text-sm text-brand-steel">{label}</p>
      </div>
    </div>
  )
}

interface RecentDocument {
  id: number
  version_name: string
  version_number: string
  branch_name: string
  created_at: string
  data?: any
}

type ActiveTab = 'home' | 'resume' | 'cover' | 'tracker' | 'ai-evaluator' | 'ats-history' | 'settings' | 'documents' | 'guidelines' | 'memory'

export default function Home() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<ActiveTab>('home')
  const [atsHistoryId, setAtsHistoryId] = useState<string | undefined>(undefined)
  const [trackerPrefillData, setTrackerPrefillData] = useState<any>(null)
  const [trackerAutoOpenModal, setTrackerAutoOpenModal] = useState(false)
  const [recentResumes, setRecentResumes] = useState<RecentDocument[]>([])
  const [recentCoverLetters, setRecentCoverLetters] = useState<RecentDocument[]>([])
  const [totalResumes, setTotalResumes] = useState(0)
  const [totalCoverLetters, setTotalCoverLetters] = useState(0)
  const [totalEvaluations, setTotalEvaluations] = useState(0)
  const [isLoadingResumes, setIsLoadingResumes] = useState(true)
  const [isLoadingCoverLetters, setIsLoadingCoverLetters] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [previewState, setPreviewState] = useState<
    | null
    | {
        kind: 'resume' | 'cover-letter'
        title: string
        fileBaseName: string
        pdfUrl: string
        data: any
      }
  >(null)

  useEffect(() => {
    if (activeTab !== 'home') return

    const fetchRecentDocuments = async () => {
      try {
        const resumesResponse = await fetch('/api/resumes')
        if (resumesResponse.ok) {
          const allResumes = await resumesResponse.json()
          setTotalResumes(allResumes.length)
          const sorted = [...allResumes].sort(
            (a: RecentDocument, b: RecentDocument) =>
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
        const coverLettersResponse = await fetch('/api/cover-letters')
        if (coverLettersResponse.ok) {
          const allCoverLetters = await coverLettersResponse.json()
          setTotalCoverLetters(allCoverLetters.length)
          const sorted = [...allCoverLetters].sort(
            (a: RecentDocument, b: RecentDocument) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setRecentCoverLetters(sorted.slice(0, 5))
        }
      } catch (error) {
        console.error('Error fetching recent cover letters:', error)
      } finally {
        setIsLoadingCoverLetters(false)
      }

      try {
        const evaluationsResponse = await fetch('/api/ats-evaluations')
        if (evaluationsResponse.ok) {
          const data = await evaluationsResponse.json()
          const evaluations = Array.isArray(data) ? data : data.evaluations || []
          setTotalEvaluations(evaluations.length)
        }
      } catch (error) {
        console.error('Error fetching evaluations:', error)
      }
    }

    fetchRecentDocuments()
  }, [activeTab])

  const handlePreviewResume = async (resume: RecentDocument) => {
    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resume.data || {}),
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPreviewState({
          kind: 'resume',
          title: resume.version_name,
          fileBaseName: `${resume.version_name}-${resume.version_number}`,
          pdfUrl: url,
          data: resume.data || {},
        })
      } else {
        showToast('error', 'Failed to preview resume. Please try again.')
      }
    } catch (error) {
      console.error('Error previewing resume:', error)
      showToast('error', 'Failed to preview resume. Please try again.')
    }
  }

  const handleDownloadResume = async (resume: RecentDocument) => {
    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resume.data || {}),
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
      } else {
        showToast('error', 'Failed to download resume. Please try again.')
      }
    } catch (error) {
      console.error('Error downloading resume:', error)
      showToast('error', 'Failed to download resume. Please try again.')
    }
  }

  const handlePreviewCoverLetter = async (coverLetter: RecentDocument) => {
    try {
      const coverLetterData = coverLetter.data || {}
      const apiData = {
        personalInfo: coverLetterData.personalInfo || {},
        recipient: coverLetterData.recipientInfo || {},
        content: {
          opening: coverLetterData.openingParagraph || '',
          bodyParagraphs: coverLetterData.bodyParagraphs || [],
          closing: coverLetterData.closingParagraph || '',
        },
      }
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPreviewState({
          kind: 'cover-letter',
          title: coverLetter.version_name,
          fileBaseName: `${coverLetter.version_name}-${coverLetter.version_number}`,
          pdfUrl: url,
          data: apiData,
        })
      } else {
        showToast('error', 'Failed to preview cover letter. Please try again.')
      }
    } catch (error) {
      console.error('Error previewing cover letter:', error)
      showToast('error', 'Failed to preview cover letter. Please try again.')
    }
  }

  const handleDownloadCoverLetter = async (coverLetter: RecentDocument) => {
    try {
      const coverLetterData = coverLetter.data || {}
      const apiData = {
        personalInfo: coverLetterData.personalInfo || {},
        recipient: coverLetterData.recipientInfo || {},
        content: {
          opening: coverLetterData.openingParagraph || '',
          bodyParagraphs: coverLetterData.bodyParagraphs || [],
          closing: coverLetterData.closingParagraph || '',
        },
      }
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
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
      } else {
        showToast('error', 'Failed to download cover letter. Please try again.')
      }
    } catch (error) {
      console.error('Error downloading cover letter:', error)
      showToast('error', 'Failed to download cover letter. Please try again.')
    }
  }

  const handleDeleteResume = async (resume: RecentDocument) => {
    if (!confirm(`Are you sure you want to delete "${resume.version_name}" (${resume.version_number})? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/resumes/${resume.id}`, { method: 'DELETE' })
      if (response.ok) {
        setRecentResumes(recentResumes.filter(r => r.id !== resume.id))
        setTotalResumes(t => Math.max(0, t - 1))
      } else {
        showToast('error', 'Failed to delete resume. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting resume:', error)
      showToast('error', 'Failed to delete resume. Please try again.')
    }
  }

  const handleDeleteCoverLetter = async (coverLetter: RecentDocument) => {
    if (!confirm(`Are you sure you want to delete "${coverLetter.version_name}" (${coverLetter.version_number})? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/cover-letters/${coverLetter.id}`, { method: 'DELETE' })
      if (response.ok) {
        setRecentCoverLetters(recentCoverLetters.filter(c => c.id !== coverLetter.id))
        setTotalCoverLetters(t => Math.max(0, t - 1))
      } else {
        showToast('error', 'Failed to delete cover letter. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting cover letter:', error)
      showToast('error', 'Failed to delete cover letter. Please try again.')
    }
  }

  const handleViewSampleResume = () => {
    window.open('/samples/resumes/sample-resume.pdf', '_blank')
  }

  const handleViewSampleCoverLetter = () => {
    window.open('/samples/cover-letters/sample-cover-letter.pdf', '_blank')
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

  type RecentItem = RecentDocument & { docType: 'resume' | 'cover' }
  const recentDocuments: RecentItem[] = [
    ...recentResumes.map(doc => ({ ...doc, docType: 'resume' as const })),
    ...recentCoverLetters.map(doc => ({ ...doc, docType: 'cover' as const })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  const sidebar = (
    <SidebarNav
      brand="Headhunter"
      onLogoClick={() => setActiveTab('home')}
      isCollapsed={isSidebarCollapsed}
      onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      items={[
        { id: 'home', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" />, active: activeTab === 'home', onClick: () => setActiveTab('home') },
        { id: 'resume', label: 'Resume', icon: <FileText className="w-4 h-4" />, active: activeTab === 'resume', onClick: () => setActiveTab('resume') },
        { id: 'cover', label: 'Cover Letter', icon: <Mail className="w-4 h-4" />, active: activeTab === 'cover', onClick: () => setActiveTab('cover') },
        { id: 'ai-evaluator', label: 'ATS Evaluator', icon: <Sparkles className="w-4 h-4" />, active: activeTab === 'ai-evaluator', onClick: () => setActiveTab('ai-evaluator') },
        { id: 'tracker', label: 'Job Tracker', icon: <BarChart3 className="w-4 h-4" />, active: activeTab === 'tracker', onClick: () => setActiveTab('tracker') },
        { id: 'documents', label: 'Documents', icon: <FolderArchive className="w-4 h-4" />, active: activeTab === 'documents', onClick: () => setActiveTab('documents') },
      ]}
      secondaryItems={[
        { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" />, active: activeTab === 'settings', onClick: () => setActiveTab('settings') },
      ]}
    />
  )

  const renderDashboard = () => (
    <div className="flex-1 bg-brand-mist/20 flex flex-col h-full overflow-hidden">
      <div className="h-[72px] px-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div>
          <h2 className="font-display font-bold text-brand-ink leading-tight">Dashboard</h2>
          <p className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Workspace Overview</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        <Card className="bg-gradient-to-br from-brand-ink to-brand-slate text-white border-none shadow-soft">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between py-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Welcome to Headhunter</p>
              <h2 className="mt-3 text-3xl font-semibold font-display">Craft confident applications today.</h2>
              <p className="mt-3 text-sm text-white/80 max-w-2xl">
                Professional resumes, tailored cover letters, and AI insights — all in one workspace to accelerate your career.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <button
                onClick={() => setActiveTab('resume')}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-ink shadow-sm transition hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                New Resume
              </button>
              <button
                onClick={() => setActiveTab('cover')}
                className="inline-flex items-center justify-center rounded-full border border-white/70 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                New Cover Letter
              </button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Resumes" value={totalResumes} meta="Total versions" icon={<FileText className="h-6 w-6" />} />
          <StatCard label="Cover Letters" value={totalCoverLetters} meta="Total versions" icon={<Mail className="h-6 w-6" />} />
          <StatCard label="Evaluations" value={totalEvaluations} meta="ATS runs logged" icon={<Sparkles className="h-6 w-6" />} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card title="Recent Documents" description="Latest resume and cover letter versions across your workspace.">
            {(isLoadingResumes || isLoadingCoverLetters) && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-brand-steel animate-fade-in">
                <Spinner size="lg" />
                <p>Loading your documents…</p>
              </div>
            )}

            {!isLoadingResumes && !isLoadingCoverLetters && recentDocuments.length === 0 && (
              <EmptyState
                title="No documents yet"
                description="Create your first resume or cover letter to start building your archive."
                icon={<FileText className="h-10 w-10" />}
                action={<Button size="sm" onClick={() => setActiveTab('resume')}>Create Resume</Button>}
              />
            )}

            {!isLoadingResumes && !isLoadingCoverLetters && recentDocuments.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-brand-border">
                <table className="w-full text-sm">
                  <thead className="bg-brand-mist text-brand-steel uppercase tracking-[0.18em] text-[11px]">
                    <tr>
                      <th className="px-4 py-3 text-left">Document</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Version</th>
                      <th className="px-4 py-3 text-left">Branch</th>
                      <th className="px-4 py-3 text-left">Updated</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border bg-white">
                    {recentDocuments.map(doc => (
                      <tr key={`${doc.docType}-${doc.id}`} className="hover:bg-brand-mist/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-brand-ink">{doc.version_name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full border border-brand-border px-2.5 py-0.5 text-xs font-semibold text-brand-slate">
                            {doc.docType === 'resume' ? 'Resume' : 'Cover Letter'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-brand-ink px-2.5 py-0.5 text-xs font-semibold text-white">
                            {doc.version_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-brand-steel">{doc.branch_name}</td>
                        <td className="px-4 py-3 text-brand-steel">{formatDate(doc.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => (doc.docType === 'resume' ? handlePreviewResume(doc) : handlePreviewCoverLetter(doc))}
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => (doc.docType === 'resume' ? handleDownloadResume(doc) : handleDownloadCoverLetter(doc))}
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => (doc.docType === 'resume' ? handleDeleteResume(doc) : handleDeleteCoverLetter(doc))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Reference Library" description="Samples and a complete writing playbook.">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('guidelines')}
                className="flex w-full items-center justify-between rounded-lg border border-brand-border bg-brand-ink px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-brand-slate"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Writing Guidelines
                </span>
                <ChevronRight className="h-4 w-4 text-white/80" />
              </button>
              <button
                onClick={handleViewSampleResume}
                className="flex w-full items-center justify-between rounded-lg border border-brand-border bg-white px-4 py-3 text-left text-sm font-medium text-brand-ink transition hover:bg-brand-mist"
              >
                Sample Resume
                <ChevronRight className="h-4 w-4 text-brand-steel" />
              </button>
              <button
                onClick={handleViewSampleCoverLetter}
                className="flex w-full items-center justify-between rounded-lg border border-brand-border bg-white px-4 py-3 text-left text-sm font-medium text-brand-ink transition hover:bg-brand-mist"
              >
                Sample Cover Letter
                <ChevronRight className="h-4 w-4 text-brand-steel" />
              </button>
            </div>
          </Card>
        </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    if (activeTab === 'resume') return <EnhancedResumeBuilder onBack={() => setActiveTab('home')} />
    if (activeTab === 'cover') return <ImprovedCoverLetterBuilder onBack={() => setActiveTab('home')} />
    if (activeTab === 'ai-evaluator') {
      return (
        <AIATSEvaluator
          onBack={() => setActiveTab('home')}
          onNavigateToHistory={evaluationId => {
            if (evaluationId) setAtsHistoryId(String(evaluationId))
            setActiveTab('ats-history')
          }}
        />
      )
    }
    if (activeTab === 'tracker') {
      return (
        <JobTrackerPage
          onBack={() => setActiveTab('home')}
          prefillData={trackerPrefillData}
          autoOpenModal={trackerAutoOpenModal}
        />
      )
    }
    if (activeTab === 'ats-history') {
      return (
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
      )
    }
    if (activeTab === 'settings') {
      return (
        <SettingsPage
          onBack={() => setActiveTab('home')}
          onOpenMemory={() => setActiveTab('memory')}
        />
      )
    }
    if (activeTab === 'documents') return <DocumentsPage onBack={() => setActiveTab('home')} />
    if (activeTab === 'guidelines') return <GuidelinesPage onBack={() => setActiveTab('home')} />
    if (activeTab === 'memory') return <MemoryPage onBack={() => setActiveTab('settings')} />
    return renderDashboard()
  }

  const closePreview = () => {
    if (previewState?.pdfUrl) URL.revokeObjectURL(previewState.pdfUrl)
    setPreviewState(null)
  }

  return (
    <>
      {previewState && (
        <PDFPreviewModal
          isOpen={true}
          onClose={closePreview}
          pdfUrl={previewState.pdfUrl}
          title={previewState.title}
          docType={previewState.kind}
          data={previewState.data}
          fileBaseName={previewState.fileBaseName}
          onDownload={() => {
            const a = document.createElement('a')
            a.href = previewState.pdfUrl
            a.download = `${previewState.fileBaseName}.pdf`.toLowerCase().replace(/\s+/g, '-')
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }}
        />
      )}
      <AppShell
        sidebar={sidebar}
        header={null}
        noPadding
        isCollapsed={isSidebarCollapsed}
        hideSidebar={activeTab === 'ats-history' || activeTab === 'settings' || activeTab === 'guidelines' || activeTab === 'memory'}
      >
        {renderContent()}
      </AppShell>
    </>
  )
}
