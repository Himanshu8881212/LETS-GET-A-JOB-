'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Circle, TrendingUp, Calendar } from 'lucide-react'

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
  }
}

interface ResumeLineageDiagramProps {
  onVersionClick: (versionId: number) => void
}

export default function ResumeLineageDiagram({ onVersionClick }: ResumeLineageDiagramProps) {
  const [lineage, setLineage] = useState<VersionNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (lineage.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
        <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No version history yet</p>
        <p className="text-sm text-gray-500 mt-1">Create your first resume to start tracking versions</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6" />
            Version Lineage
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Visual representation of your resume evolution
          </p>
        </div>
      </div>

      {/* Lineage Tree */}
      <div className="bg-white border-2 border-gray-900 rounded-xl p-8 overflow-x-auto">
        <div className="min-w-max">
          {lineage.map((root, index) => (
            <div key={root.id}>
              {index > 0 && <div className="h-8" />}
              <VersionTree
                node={root}
                level={0}
                isSelected={selectedVersion === root.id}
                onVersionClick={handleVersionClick}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-gray-600">High Success (&gt;50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">Medium Success (25-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Low Success (&lt;25%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
            <span className="text-gray-600">No Data</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Recursive component to render version tree
function VersionTree({
  node,
  level,
  isSelected,
  onVersionClick
}: {
  node: VersionNode
  level: number
  isSelected: boolean
  onVersionClick: (id: number) => void
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
    <div className="flex items-start">
      {/* Indentation */}
      {level > 0 && (
        <div className="flex items-center">
          {/* Horizontal line */}
          <div className="w-8 h-px bg-gray-400"></div>
          {/* Vertical connector */}
          <div className="w-px h-full bg-gray-400 absolute left-0 top-0"></div>
        </div>
      )}

      {/* Version Node */}
      <div className="relative">
        <button
          onClick={() => onVersionClick(node.id)}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
            ${isSelected 
              ? 'border-black bg-gray-50 shadow-md' 
              : 'border-gray-300 hover:border-gray-900 hover:shadow-sm'
            }
          `}
        >
          {/* Status Indicator */}
          <div className={`w-3 h-3 rounded-full ${successColor} flex-shrink-0`}></div>

          {/* Version Info */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{node.version_number}</span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                {node.branch_name}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{node.version_name}</div>
          </div>

          {/* Stats */}
          {hasData && (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300">
              <div className="text-center">
                <div className="text-xs text-gray-500">Success</div>
                <div className="text-sm font-bold text-gray-900">{node.stats.successRate}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Apps</div>
                <div className="text-sm font-bold text-gray-900">{node.stats.totalApplications}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Offers</div>
                <div className="text-sm font-bold text-green-600">{node.stats.offerCount}</div>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="text-xs text-gray-500 ml-auto">
            {new Date(node.created_at).toLocaleDateString()}
          </div>
        </button>

        {/* Children */}
        {node.children && node.children.length > 0 && (
          <div className="ml-8 mt-4 space-y-4 relative">
            {/* Vertical line for children */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-400"></div>
            
            {node.children.map((child) => (
              <VersionTree
                key={child.id}
                node={child}
                level={level + 1}
                isSelected={isSelected}
                onVersionClick={onVersionClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

