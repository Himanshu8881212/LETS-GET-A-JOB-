'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  GitBranch,
  Clock,
  TrendingUp,
  FileText,
  Star,
  Award
} from 'lucide-react'
import { ResumeVersionWithStats } from '@/lib/services/resume-stats-service'
import DownloadResumeModal from './DownloadResumeModal'

interface ResumeVersionHistoryProps {
  onCreateBranch: (versionId: number) => void
}

export default function ResumeVersionHistory({ onCreateBranch }: ResumeVersionHistoryProps) {
  const [versions, setVersions] = useState<ResumeVersionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'success' | 'starred'>('date')
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [selectedVersionForDownload, setSelectedVersionForDownload] = useState<number | null>(null)
  const [selectedVersionName, setSelectedVersionName] = useState<string>('')

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

  const handleDownloadClick = (versionId: number, versionName: string) => {
    setSelectedVersionForDownload(versionId)
    setSelectedVersionName(versionName)
    setShowDownloadModal(true)
  }

  const handleDownload = async (customName: string) => {
    if (!selectedVersionForDownload) return

    try {
      const response = await fetch(`/api/resumes/${selectedVersionForDownload}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${customName}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading resume:', error)
      throw error
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
      } else if (sortBy === 'success') {
        return b.stats.successRate - a.stats.successRate
      } else {
        // Sort by starred - favorites first, then by date
        if (a.isFavorite === b.isFavorite) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return a.isFavorite ? -1 : 1
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
    <>
      <div className="space-y-8">
        {/* Header with Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              Resume Version History
            </h2>
            <p className="text-gray-600 mt-2 ml-13">
              Track performance and manage different versions of your resume
            </p>
          </div>

          <div className="flex gap-3">
            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-5 py-2.5 border-2 border-gray-900 rounded-xl bg-white text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'success' | 'starred')}
              className="px-5 py-2.5 border-2 border-gray-900 rounded-xl bg-white text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <option value="date">📅 Sort by Date</option>
              <option value="success">🏆 Sort by Success Rate</option>
              <option value="starred">⭐ Sort by Starred</option>
            </select>
          </div>
        </div>

        {/* Version Cards */}
        <div className="grid gap-6">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700">No resume versions found</p>
              <p className="text-sm text-gray-500 mt-2">Create your first resume to get started</p>
            </div>
          ) : (
            filteredVersions.map((version) => (
              <div
                key={version.id}
                className="group bg-white border-2 border-gray-900 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                {/* Top Bar with Favorite */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-white">
                      <GitBranch className="w-4 h-4" />
                      <span className="text-sm font-semibold">{version.branchName}</span>
                      <span className="text-xs opacity-75">•</span>
                      <span className="text-sm font-mono">{version.versionNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-white/80 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(version.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(version.id, version.isFavorite)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${version.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white/60 hover:text-white'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Version Info */}
                    <div className="flex-1">
                      <div className="mb-4">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                          {version.versionName}
                          {version.stats.successRate >= 70 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                              <Award className="w-3 h-3" />
                              Top Performer
                            </span>
                          )}
                        </h3>
                        {version.description && (
                          <p className="text-sm text-gray-600 leading-relaxed">{version.description}</p>
                        )}
                      </div>

                      {/* Statistics Rings */}
                      <div className="flex items-center gap-6 mt-6">
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
                    <div className="lg:w-72 flex flex-col justify-between">
                      {/* Success Rate Card */}
                      <div className={`rounded-xl p-5 mb-4 ${version.stats.successRate >= 70 ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300' :
                        version.stats.successRate >= 40 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300' :
                          'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">Success Rate</span>
                          <TrendingUp className={`w-5 h-5 ${version.stats.successRate >= 70 ? 'text-green-600' :
                            version.stats.successRate >= 40 ? 'text-yellow-600' :
                              'text-gray-600'
                            }`} />
                        </div>
                        <div className="text-4xl font-black text-gray-900 mb-1">
                          {version.stats.successRate}%
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                          {version.stats.totalApplications} total application{version.stats.totalApplications !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => handleDownloadClick(version.id, version.versionName)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-semibold shadow-lg hover:shadow-xl"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </button>
                        <button
                          onClick={() => onCreateBranch(version.id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-900 rounded-xl hover:bg-gray-50 transition-all text-sm font-semibold"
                        >
                          <GitBranch className="w-4 h-4" />
                          Create Branch
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Download Modal */}
      <DownloadResumeModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        versionId={selectedVersionForDownload || 0}
        currentVersionName={selectedVersionName}
      />
    </>
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

