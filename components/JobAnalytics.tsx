'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Briefcase, CheckCircle, XCircle, Clock } from 'lucide-react'
import { JobApplication, JobTrackerStats } from '@/types/job-tracker'

interface JobAnalyticsProps {
  jobs: JobApplication[]
}

export default function JobAnalytics({ jobs }: JobAnalyticsProps) {
  const stats: JobTrackerStats = useMemo(() => {
    const total = jobs.length
    const applied = jobs.filter(j => j.status === 'applied').length
    const interview = jobs.filter(j => j.status === 'interview').length
    const offer = jobs.filter(j => j.status === 'offer').length
    const rejected = jobs.filter(j => j.status === 'rejected').length

    const successRate = total > 0 ? (offer / total) * 100 : 0
    const interviewRate = total > 0 ? (interview / total) * 100 : 0

    return {
      total,
      applied,
      interview,
      offer,
      rejected,
      successRate,
      interviewRate,
    }
  }, [jobs])

  const resumePerformance = useMemo(() => {
    const resumeStats = new Map<string, { total: number; interviews: number; offers: number }>()

    jobs.forEach(job => {
      const version = job.resumeVersion || 'No Version'
      const current = resumeStats.get(version) || { total: 0, interviews: 0, offers: 0 }

      current.total++
      if (job.status === 'interview') current.interviews++
      if (job.status === 'offer') current.offers++

      resumeStats.set(version, current)
    })

    return Array.from(resumeStats.entries())
      .map(([version, data]) => ({
        version,
        ...data,
        interviewRate: (data.interviews / data.total) * 100,
        offerRate: (data.offers / data.total) * 100,
      }))
      .sort((a, b) => b.offerRate - a.offerRate)
  }, [jobs])

  const recentActivity = useMemo(() => {
    return [...jobs]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
  }, [jobs])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-50 text-blue-700'
      case 'interview':
        return 'bg-amber-50 text-amber-700'
      case 'offer':
        return 'bg-green-50 text-green-700'
      case 'rejected':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-brand-mist text-brand-ink'
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20">
        <Briefcase className="w-16 h-16 text-brand-steel mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-brand-ink mb-2">No Applications Yet</h3>
        <p className="text-sm text-brand-steel">Add your first job application to see analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div>
        <h2 className="text-lg font-semibold text-brand-ink mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Applications */}
          <div className="bg-white border border-brand-border p-6 rounded-xl shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-brand-mist rounded-lg">
                <Briefcase className="w-5 h-5 text-brand-steel" />
              </span>
              <span className="text-2xl font-semibold text-brand-ink">{stats.total}</span>
            </div>
            <p className="text-sm text-brand-steel font-medium">Total Applications</p>
          </div>

          {/* Interview Rate */}
          <div className="bg-white border border-brand-border p-6 rounded-xl shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </span>
              <span className="text-2xl font-semibold text-blue-600">{stats.interviewRate.toFixed(1)}%</span>
            </div>
            <p className="text-sm text-brand-steel font-medium">Interview Rate</p>
            <p className="text-xs text-brand-steel mt-1">{stats.interview} interviews</p>
          </div>

          {/* Success Rate */}
          <div className="bg-white border border-brand-border p-6 rounded-xl shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </span>
              <span className="text-2xl font-semibold text-green-600">{stats.successRate.toFixed(1)}%</span>
            </div>
            <p className="text-sm text-brand-steel font-medium">Success Rate</p>
            <p className="text-xs text-brand-steel mt-1">{stats.offer} offers</p>
          </div>

          {/* Rejection Rate */}
          <div className="bg-white border border-brand-border p-6 rounded-xl shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </span>
              <span className="text-2xl font-semibold text-red-600">
                {((stats.rejected / stats.total) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-brand-steel font-medium">Rejection Rate</p>
            <p className="text-xs text-brand-steel mt-1">{stats.rejected} rejections</p>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-brand-ink mb-4">Status Breakdown</h2>
        <div className="bg-white border border-brand-border p-6 rounded-xl shadow-soft">
          <div className="space-y-4">
            {[
              { label: 'Applied', count: stats.applied, color: 'bg-blue-500' },
              { label: 'Interview', count: stats.interview, color: 'bg-amber-500' },
              { label: 'Offer', count: stats.offer, color: 'bg-green-500' },
              { label: 'Rejected', count: stats.rejected, color: 'bg-red-500' },
            ].map(item => {
              const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-brand-ink">{item.label}</span>
                    <span className="text-sm text-brand-steel">
                      {item.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-brand-mist h-2 rounded-full">
                    <div
                      className={`${item.color} h-2 transition-all rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>



      {/* Recent Activity - Max 5 items visible, then scroll */}
      <div>
        <h2 className="text-lg font-semibold text-brand-ink mb-4">Recent Activity</h2>
        <div className="bg-white border border-brand-border divide-y divide-brand-border overflow-y-auto rounded-xl shadow-soft" style={{ maxHeight: 'calc(5 * 140px)' }}>
          {recentActivity.slice(0, 10).map(job => (
            <div key={job.id} className="p-6 hover:bg-brand-mist transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-brand-ink">{job.company}</h3>
                  <p className="text-sm text-brand-slate mt-1">{job.position}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-brand-steel">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(job.updatedAt)}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <span>•</span>
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium capitalize rounded-full ${getStatusColor(
                    job.status
                  )}`}
                >
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

