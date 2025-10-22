'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, BarChart3, TrendingUp } from 'lucide-react'
import JobTrackerBoard from '@/components/JobTrackerBoard'
import JobAnalytics from '@/components/JobAnalytics'
import { JobApplication } from '@/types/job-tracker'

export default function JobTrackerPage() {
  const [activeView, setActiveView] = useState<'board' | 'analytics'>('board')
  const [jobs, setJobs] = useState<JobApplication[]>([])

  // Load jobs from localStorage on mount
  useEffect(() => {
    const savedJobs = localStorage.getItem('job-applications')
    if (savedJobs) {
      const parsed = JSON.parse(savedJobs)
      // Convert date strings back to Date objects
      const jobsWithDates = parsed.map((job: any) => ({
        ...job,
        applicationDate: new Date(job.applicationDate),
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
        statusHistory: job.statusHistory.map((sh: any) => ({
          ...sh,
          timestamp: new Date(sh.timestamp)
        }))
      }))
      setJobs(jobsWithDates)
    }
  }, [])

  // Save jobs to localStorage whenever they change
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('job-applications', JSON.stringify(jobs))
    }
  }, [jobs])

  const handleAddJob = (newJob: JobApplication) => {
    setJobs([...jobs, newJob])
  }

  const handleUpdateJob = (updatedJob: JobApplication) => {
    setJobs(jobs.map(job => job.id === updatedJob.id ? updatedJob : job))
  }

  const handleDeleteJob = (jobId: string) => {
    setJobs(jobs.filter(job => job.id !== jobId))
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
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'board'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Board
                </button>
                <button
                  onClick={() => setActiveView('analytics')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'analytics'
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

