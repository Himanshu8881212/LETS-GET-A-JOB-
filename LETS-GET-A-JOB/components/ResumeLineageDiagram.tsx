'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Filter, Calendar, Award, Search, Download, Star, Trash2 } from 'lucide-react'

interface VersionNode {
  id: number
  version_name: string
  version_number: string
  branch_name: string
  parent_version_id: number | null
  created_at: string
  is_active: boolean
  is_favorite: boolean
  children: VersionNode[]
  stats: {
    totalApplications: number
    successRate: number
    offerCount: number
    appliedCount: number
    interviewCount: number
    rejectedCount: number
  }
}

interface ResumeLineageDiagramProps {
  onVersionClick: (versionId: number) => void
  onDownload?: (versionId: number) => void
  onCreateBranch?: (versionId: number) => void
  onToggleStar?: (versionId: number, currentStarred: boolean) => void
  onDelete?: (versionId: number) => void
}

export default function ResumeLineageDiagram({
  onVersionClick,
  onDownload,
  onCreateBranch,
  onToggleStar,
  onDelete
}: ResumeLineageDiagramProps) {
  const [lineage, setLineage] = useState<VersionNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [minSuccessRate, setMinSuccessRate] = useState<number>(0)
  const [showOnlyWithData, setShowOnlyWithData] = useState(false)
  const [showOnlyStarred, setShowOnlyStarred] = useState(false)
  const [selectedMainResume, setSelectedMainResume] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    fetchLineage()
  }, [])

  const fetchLineage = async () => {
    try {
      const response = await fetch('/api/resumes/lineage')
      if (response.ok) {
        const data = await response.json()
        setLineage(data)
      }
    } catch (error) {
      console.error('Error fetching lineage:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVersionClick = (versionId: number) => {
    setSelectedVersion(versionId)
    onVersionClick(versionId)
  }

  const filterNode = (node: VersionNode): boolean => {
    // Search filter - search both version name and branch name
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = node.version_name.toLowerCase().includes(query)
      const matchesBranch = node.branch_name.toLowerCase().includes(query)
      if (!matchesName && !matchesBranch) {
        return false
      }
    }

    // Branch filter
    if (selectedBranch !== 'all' && node.branch_name !== selectedBranch) {
      return false
    }

    // Success rate filter
    if (node.stats.successRate < minSuccessRate) {
      return false
    }

    // Show only with data filter
    if (showOnlyWithData && node.stats.totalApplications === 0) {
      return false
    }

    // Show only starred filter
    if (showOnlyStarred && !node.is_favorite) {
      return false
    }

    return true
  }

  const filterTree = (nodes: VersionNode[]): VersionNode[] => {
    const filtered: VersionNode[] = []

    for (const node of nodes) {
      // Recursively filter children first
      const filteredChildren = node.children ? filterTree(node.children) : []

      // Include node if:
      // 1. It matches the filter criteria, OR
      // 2. It has children that match (to preserve tree structure)
      if (filterNode(node) || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren
        })
      }
    }

    return filtered
  }

  // Filter by specific main resume lineage
  const filterByMainResume = (nodes: VersionNode[]): VersionNode[] => {
    if (!selectedMainResume) return nodes

    // Find the selected resume and return only its lineage
    const findResumeLineage = (nodes: VersionNode[]): VersionNode | null => {
      for (const node of nodes) {
        if (node.id === selectedMainResume) {
          return node
        }
        if (node.children) {
          const found = findResumeLineage(node.children)
          if (found) return found
        }
      }
      return null
    }

    const selectedNode = findResumeLineage(nodes)
    return selectedNode ? [selectedNode] : []
  }

  // Get all main resumes (resumes without parents)
  const getAllMainResumes = (nodes: VersionNode[]): VersionNode[] => {
    const mainResumes: VersionNode[] = []
    const traverse = (nodes: VersionNode[]) => {
      for (const node of nodes) {
        if (!node.parent_version_id) {
          mainResumes.push(node)
        }
        if (node.children) {
          traverse(node.children)
        }
      }
    }
    traverse(nodes)
    return mainResumes
  }

  const mainResumes = getAllMainResumes(lineage)

  // Apply filters in order: first filter tree (search, branch, success rate), then filter by main resume
  let filteredLineage = filterTree(lineage)

  // If a specific main resume is selected, show only its lineage
  if (selectedMainResume) {
    filteredLineage = filterByMainResume(filteredLineage)
  } else if (!searchQuery && selectedBranch === 'all' && !showOnlyWithData && !showOnlyStarred && minSuccessRate === 0) {
    // Default view: show only main branch root resumes (when NO filters are active)
    filteredLineage = filteredLineage.filter(node =>
      !node.parent_version_id && node.branch_name === 'main'
    )
  }
  // Otherwise show all filtered results (any filter is active)

  const branches = Array.from(new Set(lineage.flatMap(getAllBranches)))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (lineage.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
        <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-700">No version history yet</p>
        <p className="text-sm text-gray-500 mt-2">Create your first resume to start tracking versions</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            Version Lineage
          </h2>
          <p className="text-gray-600 mt-2 ml-13">
            Visual representation of your resume evolution
          </p>
        </div>

        {/* Compact Filters Panel */}
        <div className="bg-white border-2 border-gray-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-900" />
            <h3 className="text-sm font-bold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Main Resume Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Select Main Resume
              </label>
              <select
                value={selectedMainResume || ''}
                onChange={(e) => setSelectedMainResume(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg bg-white text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <option value="">All Resumes</option>
                {mainResumes.map(resume => (
                  <option key={resume.id} value={resume.id}>
                    {resume.version_name} ({resume.branch_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Search Resumes
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-8 pr-3 py-2 border-2 border-gray-900 rounded-lg bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
                />
              </div>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg bg-white text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {/* Display Options */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Display Options
              </label>
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyWithData}
                    onChange={(e) => setShowOnlyWithData(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span className="text-xs text-gray-700">Only show versions with applications</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyStarred}
                    onChange={(e) => setShowOnlyStarred(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span className="text-xs text-gray-700">Only show starred resumes</span>
                </label>
              </div>
            </div>
          </div>

          {/* Min Success Rate Slider - Full Width Below */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Min Success Rate: {minSuccessRate}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={minSuccessRate}
              onChange={(e) => setMinSuccessRate(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-900 rounded-2xl p-8 overflow-x-auto">
        <div className="min-w-max">
          {filteredLineage.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No versions match the current filters</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filter criteria</p>
            </div>
          ) : (
            filteredLineage.map((root, index) => (
              <div key={root.id}>
                {index > 0 && <div className="h-8" />}
                <VersionTree
                  node={root}
                  level={0}
                  isSelected={selectedVersion === root.id}
                  onVersionClick={handleVersionClick}
                  onDownload={onDownload}
                  onCreateBranch={onCreateBranch}
                  onToggleStar={onToggleStar}
                  onDelete={onDelete}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function getAllBranches(node: VersionNode): string[] {
  const branches = [node.branch_name]
  if (node.children) {
    node.children.forEach(child => {
      branches.push(...getAllBranches(child))
    })
  }
  return branches
}

function VersionTree({
  node,
  level,
  isSelected,
  onVersionClick,
  onDownload,
  onCreateBranch,
  onToggleStar,
  onDelete,
  isLast = false
}: {
  node: VersionNode
  level: number
  isSelected: boolean
  onVersionClick: (id: number) => void
  onDownload?: (id: number) => void
  onCreateBranch?: (id: number) => void
  onToggleStar?: (id: number, currentStarred: boolean) => void
  onDelete?: (id: number) => void
  isLast?: boolean
}) {
  const getSuccessColor = (successRate: number, hasData: boolean) => {
    if (!hasData) return 'bg-gray-300'
    if (successRate >= 50) return 'bg-green-500'
    if (successRate >= 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const hasData = node.stats.totalApplications > 0
  const successColor = getSuccessColor(node.stats.successRate, hasData)

  return (
    <div className="flex items-start relative">
      {/* Connecting line from parent */}
      {level > 0 && (
        <div className="flex items-center mr-4">
          {/* Horizontal line */}
          <div className="w-8 h-px bg-gray-400"></div>
          {/* Arrow head */}
          <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-gray-400"></div>
        </div>
      )}

      <div className="relative flex-1">
        <div
          className={`
            flex flex-col gap-4 px-5 py-4 rounded-xl border-2 transition-all w-full
            ${isSelected
              ? 'border-black bg-gray-50 shadow-xl'
              : 'border-gray-300 hover:border-gray-900 hover:shadow-lg'
            }
          `}
        >
          {/* Top row: Version info and date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${successColor} flex-shrink-0 shadow-md`}></div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-gray-900">{node.version_number}</span>
                <span className="px-2.5 py-0.5 bg-gray-900 text-white rounded-lg text-xs font-semibold">
                  {node.branch_name}
                </span>
                {node.stats.successRate >= 70 && hasData && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Top
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 font-medium">{node.version_name}</div>
            </div>
            <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(node.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>

          {/* Bottom row: 4 rings and buttons */}
          <div className="flex items-center justify-between">
            {/* 4 Rings - Show percentages with fill based on percentage */}
            <div className="flex items-center gap-6">
              {/* Applied Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                    {/* Background circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                    />
                    {/* Progress circle */}
                    {node.stats.totalApplications > 0 && node.stats.appliedCount > 0 && (
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="4"
                        strokeDasharray={`${(node.stats.appliedCount / node.stats.totalApplications) * 125.6} 125.6`}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">
                      {node.stats.totalApplications > 0
                        ? `${Math.round((node.stats.appliedCount / node.stats.totalApplications) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-600 font-medium mt-1">Applied</span>
              </div>

              {/* Interview Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                    {/* Background circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                    />
                    {/* Progress circle */}
                    {node.stats.totalApplications > 0 && node.stats.interviewCount > 0 && (
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="4"
                        strokeDasharray={`${(node.stats.interviewCount / node.stats.totalApplications) * 125.6} 125.6`}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">
                      {node.stats.totalApplications > 0
                        ? `${Math.round((node.stats.interviewCount / node.stats.totalApplications) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-600 font-medium mt-1">Interview</span>
              </div>

              {/* Offer Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                    {/* Background circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                    />
                    {/* Progress circle */}
                    {node.stats.totalApplications > 0 && node.stats.offerCount > 0 && (
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="4"
                        strokeDasharray={`${(node.stats.offerCount / node.stats.totalApplications) * 125.6} 125.6`}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">
                      {node.stats.totalApplications > 0
                        ? `${Math.round((node.stats.offerCount / node.stats.totalApplications) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-600 font-medium mt-1">Offer</span>
              </div>

              {/* Rejected Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                    {/* Background circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                    />
                    {/* Progress circle */}
                    {node.stats.totalApplications > 0 && node.stats.rejectedCount > 0 && (
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="4"
                        strokeDasharray={`${(node.stats.rejectedCount / node.stats.totalApplications) * 125.6} 125.6`}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">
                      {node.stats.totalApplications > 0
                        ? `${Math.round((node.stats.rejectedCount / node.stats.totalApplications) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-600 font-medium mt-1">Rejected</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {onToggleStar && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStar(node.id, node.is_favorite)
                  }}
                  className={`p-2 rounded-lg font-semibold transition-colors ${node.is_favorite
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                    : 'bg-white border-2 border-gray-300 text-gray-600 hover:border-yellow-500 hover:text-yellow-600'
                    }`}
                  title={node.is_favorite ? 'Unstar' : 'Star'}
                >
                  <Star className={`w-4 h-4 ${node.is_favorite ? 'fill-current' : ''}`} />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDownload(node.id)
                  }}
                  className="px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-lg font-semibold hover:bg-gray-900 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
              {onCreateBranch && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateBranch(node.id)
                  }}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-black transition-colors flex items-center gap-2"
                >
                  <GitBranch className="w-4 h-4" />
                  Branch
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Are you sure you want to delete "${node.version_name}"? This action cannot be undone.`)) {
                      onDelete(node.id)
                    }
                  }}
                  className="p-2 bg-white border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="ml-8 mt-6 space-y-6 relative">
            {/* Vertical connecting line */}
            <div className="absolute left-0 top-0 bottom-6 w-px bg-gray-400"></div>

            {node.children.map((child, index) => (
              <div key={child.id} className="relative">
                <VersionTree
                  node={child}
                  level={level + 1}
                  isSelected={isSelected}
                  onVersionClick={onVersionClick}
                  onDownload={onDownload}
                  onCreateBranch={onCreateBranch}
                  onToggleStar={onToggleStar}
                  onDelete={onDelete}
                  isLast={index === node.children.length - 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
