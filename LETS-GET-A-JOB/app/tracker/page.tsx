'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, BarChart3, TrendingUp } from 'lucide-react'
import { JobApplication, JobStatus } from '@/types/job-tracker'

// Lazy load heavy components
const JobTrackerBoard = dynamic(
  () => import('@/components/JobTrackerBoard'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Job Tracker...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

const JobAnalytics = dynamic(
  () => import('@/components/JobAnalytics'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Analytics...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

export default function JobTrackerPage() {
  const [activeView, setActiveView] = useState<'board' | 'analytics'>('board')
  const [jobs, setJobs] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)

  // Load jobs from database on mount
  useEffect(() => {
    fetchJobs()
  }, [])

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
      } else {
        const error = await response.json()
        console.error('Error adding job:', error)
        alert('Failed to add job application: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error adding job:', error)
      alert('Failed to add job application')
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
        alert('Failed to update job application')
      }
    } catch (error) {
      console.error('Error updating job:', error)
      alert('Failed to update job application')
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
        alert('Failed to delete job application')
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job application')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="p-2 hover:bg-gray-800 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Job Tracker</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex bg-gray-800 rounded p-1">
                <button
                  onClick={() => setActiveView('board')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'board'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Board
                </button>
                <button
                  onClick={() => setActiveView('analytics')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'analytics'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'board' ? (
          <JobTrackerBoard
            jobs={jobs}
            onAddJob={handleAddJob}
            onUpdateJob={handleUpdateJob}
            onDeleteJob={handleDeleteJob}
          />
        ) : (
          <JobAnalytics jobs={jobs} />
        )}
      </main>
    </div>
  )
}

