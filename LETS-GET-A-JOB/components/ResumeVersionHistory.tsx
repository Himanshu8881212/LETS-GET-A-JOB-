'use client'

import { useState, useEffect } from 'react'
import { 
  Download, 
  Edit, 
  GitBranch, 
  Clock, 
  TrendingUp, 
  FileText,
  Star,
  Copy,
  Trash2,
  Eye
} from 'lucide-react'
import { ResumeVersionWithStats } from '@/lib/services/resume-stats-service'

interface ResumeVersionHistoryProps {
  onEdit: (versionId: number) => void
  onCreateBranch: (versionId: number) => void
}

export default function ResumeVersionHistory({ onEdit, onCreateBranch }: ResumeVersionHistoryProps) {
  const [versions, setVersions] = useState<ResumeVersionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'success'>('date')

  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    try {
      const response = await fetch('/api/resumes/versions-with-stats')
      if (response.ok) {
        const data = await response.json()
        setVersions(data)
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (versionId: number) => {
    try {
      const response = await fetch(`/api/resumes/${versionId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resume-v${versionId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading resume:', error)
    }
  }

  const handleToggleFavorite = async (versionId: number, currentFavorite: boolean) => {
    try {
      await fetch(`/api/resumes/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !currentFavorite })
      })
      fetchVersions()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const filteredVersions = versions
    .filter(v => selectedBranch === 'all' || v.branchName === selectedBranch)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        return b.stats.successRate - a.stats.successRate
      }
    })

  const branches = Array.from(new Set(versions.map(v => v.branchName)))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resume Version History</h2>
          <p className="text-gray-600 text-sm mt-1">
            Track performance and manage different versions of your resume
          </p>
        </div>

        <div className="flex gap-3">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2 border-2 border-gray-900 rounded-lg bg-white text-sm font-medium"
          >
            <option value="all">All Branches</option>
            {branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'success')}
            className="px-4 py-2 border-2 border-gray-900 rounded-lg bg-white text-sm font-medium"
          >
            <option value="date">Sort by Date</option>
            <option value="success">Sort by Success Rate</option>
          </select>
        </div>
      </div>

      {/* Version Cards */}
      <div className="grid gap-4">
        {filteredVersions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No resume versions found</p>
            <p className="text-sm text-gray-500 mt-1">Create your first resume to get started</p>
          </div>
        ) : (
          filteredVersions.map((version) => (
            <div
              key={version.id}
              className="bg-white border-2 border-gray-900 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Version Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{version.versionName}</h3>
                        <button
                          onClick={() => handleToggleFavorite(version.id, version.isFavorite)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              version.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-4 h-4" />
                          {version.branchName} • {version.versionNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {version.description && (
                    <p className="text-sm text-gray-600 mb-3">{version.description}</p>
                  )}

                  {/* Statistics Rings */}
                  <div className="flex items-center gap-4 mt-4">
                    <StatRing
                      label="Applied"
                      percentage={version.stats.appliedPercentage}
                      count={version.stats.appliedCount}
                      color="bg-blue-500"
                    />
                    <StatRing
                      label="Interview"
                      percentage={version.stats.interviewPercentage}
                      count={version.stats.interviewCount}
                      color="bg-yellow-500"
                    />
                    <StatRing
                      label="Offer"
                      percentage={version.stats.offerPercentage}
                      count={version.stats.offerCount}
                      color="bg-green-500"
                    />
                    <StatRing
                      label="Rejected"
                      percentage={version.stats.rejectedPercentage}
                      count={version.stats.rejectedCount}
                      color="bg-red-500"
                    />
                  </div>
                </div>

                {/* Right: Success Metrics & Actions */}
                <div className="lg:w-64 flex flex-col justify-between">
                  {/* Success Rate */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Success Rate</span>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {version.stats.successRate}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {version.stats.totalApplications} total applications
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onEdit(version.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDownload(version.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-gray-900 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => onCreateBranch(version.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-gray-900 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium col-span-2"
                    >
                      <GitBranch className="w-4 h-4" />
                      Create Branch
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Stat Ring Component
function StatRing({ label, percentage, count, color }: { 
  label: string
  percentage: number
  count: number
  color: string 
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - percentage / 100)}`}
            className={color.replace('bg-', 'text-')}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-900">{count}</span>
        </div>
      </div>
      <span className="text-xs text-gray-600 mt-1">{label}</span>
    </div>
  )
}

