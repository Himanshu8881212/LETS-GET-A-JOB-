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
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'interview':
        return 'bg-blue-50 text-blue-700 border-blue-300'
      case 'offer':
        return 'bg-green-50 text-green-700 border-green-300'
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20">
        <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Applications Yet</h3>
        <p className="text-gray-600">Add your first job application to see analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Applications */}
          <div className="bg-white border-2 border-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Briefcase className="w-8 h-8 text-gray-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
            </div>
            <p className="text-gray-600 font-medium">Total Applications</p>
          </div>

          {/* Interview Rate */}
          <div className="bg-white border-2 border-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">{stats.interviewRate.toFixed(1)}%</span>
            </div>
            <p className="text-gray-600 font-medium">Interview Rate</p>
            <p className="text-sm text-gray-500 mt-1">{stats.interview} interviews</p>
          </div>

          {/* Success Rate */}
          <div className="bg-white border-2 border-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</span>
            </div>
            <p className="text-gray-600 font-medium">Success Rate</p>
            <p className="text-sm text-gray-500 mt-1">{stats.offer} offers</p>
          </div>

          {/* Rejection Rate */}
          <div className="bg-white border-2 border-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
              <span className="text-3xl font-bold text-red-600">
                {((stats.rejected / stats.total) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-gray-600 font-medium">Rejection Rate</p>
            <p className="text-sm text-gray-500 mt-1">{stats.rejected} rejections</p>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Status Breakdown</h2>
        <div className="bg-white border-2 border-gray-900 rounded-xl p-6">
          <div className="space-y-4">
            {[
              { label: 'Applied', count: stats.applied, color: 'bg-gray-600' },
              { label: 'Interview', count: stats.interview, color: 'bg-blue-600' },
              { label: 'Offer', count: stats.offer, color: 'bg-green-600' },
              { label: 'Rejected', count: stats.rejected, color: 'bg-red-600' },
            ].map(item => {
              const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-900">{item.label}</span>
                    <span className="text-gray-600">
                      {item.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${item.color} h-3 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Resume Performance */}
      {resumePerformance.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Resume Performance</h2>
          <div className="bg-white border-2 border-gray-900 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">Resume Version</th>
                  <th className="px-6 py-4 text-center font-bold">Applications</th>
                  <th className="px-6 py-4 text-center font-bold">Interviews</th>
                  <th className="px-6 py-4 text-center font-bold">Offers</th>
                  <th className="px-6 py-4 text-center font-bold">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-900">
                {resumePerformance.map((resume, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{resume.version}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{resume.total}</td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {resume.interviews} ({resume.interviewRate.toFixed(0)}%)
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {resume.offers} ({resume.offerRate.toFixed(0)}%)
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${resume.offerRate >= 10
                            ? 'bg-green-100 text-green-800'
                            : resume.offerRate >= 5
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {resume.offerRate >= 10 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {resume.offerRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="bg-white border-2 border-gray-900 rounded-xl divide-y-2 divide-gray-900">
          {recentActivity.map(job => (
            <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">{job.company}</h3>
                  <p className="text-gray-700 mt-1">{job.position}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
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
                  className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(
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

