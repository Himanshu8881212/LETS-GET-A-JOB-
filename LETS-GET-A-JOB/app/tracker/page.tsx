'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, BarChart3, TrendingUp } from 'lucide-react'
import JobTrackerBoard from '@/components/JobTrackerBoard'
import JobAnalytics from '@/components/JobAnalytics'
import { JobApplication } from '@/types/job-tracker'

export default function JobTrackerPage() {
  const [activeView, setActiveView] = useState<'board' | 'analytics'>('board')
  const [jobs, setJobs] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)

  // Load jobs from database on mount
  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddJob = async (newJob: JobApplication) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob)
      })

      if (response.ok) {
        setJobs([...jobs, newJob])
      }
    } catch (error) {
      console.error('Error adding job:', error)
    }
  }

  const handleUpdateJob = async (updatedJob: JobApplication) => {
    try {
      const oldJob = jobs.find(j => j.id === updatedJob.id)
      const response = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedJob,
          oldStatus: oldJob?.status
        })
      })

      if (response.ok) {
        setJobs(jobs.map(job => job.id === updatedJob.id ? updatedJob : job))
      }
    } catch (error) {
      console.error('Error updating job:', error)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs?id=${jobId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setJobs(jobs.filter(job => job.id !== jobId))
      }
    } catch (error) {
      console.error('Error deleting job:', error)
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
      <header className="bg-black text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Job Application Tracker</h1>
                <p className="text-gray-400 text-sm">Track and analyze your job applications</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-gray-800 rounded-lg p-1">
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

