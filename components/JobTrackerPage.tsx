'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, BarChart3, TrendingUp } from 'lucide-react'
import { JobApplication, JobStatus } from '@/types/job-tracker'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'

// Lazy load heavy components
const JobTrackerBoard = dynamic(
  () => import('@/components/JobTrackerBoard'),
  {
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-3 py-12 animate-fade-in">
        <Spinner size="lg" />
        <p className="text-sm text-brand-steel">Loading Job Tracker…</p>
      </div>
    ),
    ssr: false,
  },
)

const JobAnalytics = dynamic(
  () => import('@/components/JobAnalytics'),
  {
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-3 py-12 animate-fade-in">
        <Spinner size="lg" />
        <p className="text-sm text-brand-steel">Loading Analytics…</p>
      </div>
    ),
    ssr: false,
  },
)

interface JobTrackerPageProps {
  onBack?: () => void
  prefillData?: any
  autoOpenModal?: boolean
}

export default function JobTrackerPage({ onBack, prefillData, autoOpenModal = false }: JobTrackerPageProps = {}) {
  const [activeView, setActiveView] = useState<'board' | 'analytics'>('board')
  const [jobs, setJobs] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [initialJobData, setInitialJobData] = useState<any>(prefillData || null)
  const [shouldAutoOpen, setShouldAutoOpen] = useState(autoOpenModal)
  const { showToast } = useToast()

  // Load jobs from database on mount
  useEffect(() => {
    fetchJobs()
  }, [])

  // Update initial job data when prefillData prop changes
  useEffect(() => {
    if (prefillData) {
      setInitialJobData(prefillData)
      setShouldAutoOpen(autoOpenModal)
    }
  }, [prefillData, autoOpenModal])

  // Transform database format to frontend format
  const transformJob = (dbJob: any): JobApplication => {
    // Map backend status to frontend status
    const statusMap: Record<string, JobStatus> = {
      'interviewing': 'interview',
      'applied': 'applied',
      'offer': 'offer',
      'rejected': 'rejected'
    }

    return {
      id: dbJob.id.toString(),
      company: dbJob.company,
      position: dbJob.position,
      status: statusMap[dbJob.status] || dbJob.status as JobStatus,
      applicationDate: new Date(dbJob.applied_date || dbJob.created_at),
      resumeVersion: dbJob.resume_version,
      resumeVersionId: dbJob.resume_version_id,
      coverLetterVersionId: dbJob.cover_letter_version_id,
      salary: dbJob.salary_range,
      location: dbJob.location,
      jobUrl: dbJob.job_url,
      contactPerson: dbJob.contact_name,
      contactEmail: dbJob.contact_email,
      notes: dbJob.notes || '',
      statusHistory: [],
      createdAt: new Date(dbJob.created_at),
      updatedAt: new Date(dbJob.updated_at),
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        const transformedJobs = data.map(transformJob)
        setJobs(transformedJobs)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddJob = async (newJob: any) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob)
      })

      if (response.ok) {
        const createdJob = await response.json()
        const transformedJob = transformJob(createdJob)
        setJobs([...jobs, transformedJob])
        // Clear prefill data after successful add
        setInitialJobData(null)
        setShouldAutoOpen(false)
      } else {
        const error = await response.json()
        console.error('Error adding job:', error)
        showToast('error', 'Failed to add job: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error adding job:', error)
      showToast('error', 'Failed to add job application')
    }
  }

  const handleUpdateJob = async (updatedJob: JobApplication) => {
    try {
      // Map frontend status to backend status
      const statusMap: Record<string, string> = {
        'interview': 'interviewing',
        'applied': 'applied',
        'offer': 'offer',
        'rejected': 'rejected'
      }

      // Format date for backend (YYYY-MM-DD)
      const formatDateForBackend = (date: Date) => {
        const d = new Date(date)
        if (isNaN(d.getTime())) return undefined
        return d.toISOString().split('T')[0]
      }

      const response = await fetch(`/api/jobs/${updatedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: updatedJob.company,
          position: updatedJob.position,
          status: statusMap[updatedJob.status] || updatedJob.status,
          applied_date: formatDateForBackend(updatedJob.applicationDate),
          // salary_range removed from schema
          location: updatedJob.location,
          notes: updatedJob.notes,
          resume_version_id: updatedJob.resumeVersionId,
          cover_letter_version_id: updatedJob.coverLetterVersionId,
          job_url: updatedJob.jobUrl,
          contact_name: updatedJob.contactPerson,
          contact_email: updatedJob.contactEmail,
        })
      })

      if (response.ok) {
        const updated = await response.json()
        setJobs(jobs.map(job => job.id === updatedJob.id ? updatedJob : job))
      } else {
        const error = await response.json()
        console.error('Error updating job:', error)
        showToast('error', 'Failed to update job application')
      }
    } catch (error) {
      console.error('Error updating job:', error)
      showToast('error', 'Failed to update job application')
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setJobs(jobs.filter(job => job.id !== jobId))
      } else {
        const error = await response.json()
        console.error('Error deleting job:', error)
        showToast('error', 'Failed to delete job application')
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      showToast('error', 'Failed to delete job application')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-mist flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Spinner size="lg" />
          <p className="text-sm text-brand-steel">Loading job applications…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-mist/20">
      {/* Header */}
      <header className="h-[72px] px-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-brand-mist rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold text-brand-ink">Job Tracker</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-brand-mist p-1 rounded-full">
            <button
              onClick={() => setActiveView('board')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors rounded-full ${activeView === 'board'
                ? 'bg-white text-brand-ink shadow-soft'
                : 'text-brand-steel hover:text-brand-ink'
                }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors rounded-full ${activeView === 'analytics'
                ? 'bg-white text-brand-ink shadow-soft'
                : 'text-brand-steel hover:text-brand-ink'
                }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeView === 'board' ? (
          <JobTrackerBoard
            jobs={jobs}
            onAddJob={handleAddJob}
            onUpdateJob={handleUpdateJob}
            onDeleteJob={handleDeleteJob}
            initialJobData={initialJobData}
            autoOpenModal={shouldAutoOpen}
            onModalClose={() => {
              setInitialJobData(null)
              setShouldAutoOpen(false)
            }}
          />
        ) : (
          <JobAnalytics jobs={jobs} />
        )}
      </main>
    </div>
  )
}

