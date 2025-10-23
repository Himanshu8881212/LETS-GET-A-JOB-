'use client'

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, FileText } from 'lucide-react'

interface DownloadResumeModalProps {
  isOpen: boolean
  onClose: () => void
  onDownload: (name: string, branchName: string) => Promise<void>
  versionId: number
  currentVersionName?: string
  isBranchedResume?: boolean  // If true, name field is readonly
}

export default function DownloadResumeModal({
  isOpen,
  onClose,
  onDownload,
  versionId,
  currentVersionName = '',
  isBranchedResume = false
}: DownloadResumeModalProps) {
  const [resumeName, setResumeName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [existingVersions, setExistingVersions] = useState<string[]>([])
  const [suggestedName, setSuggestedName] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchExistingVersions()
      // Set initial name from current version
      const baseName = currentVersionName.replace(/\s+v\d+\.\d+$/, '')
      setResumeName(baseName || 'My Resume')
      // Generate default branch name from resume name
      if (isBranchedResume) {
        const defaultBranch = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        setBranchName(defaultBranch || 'new-branch')
      } else {
        setBranchName('main')
      }
    }
  }, [isOpen, currentVersionName, isBranchedResume])

  const fetchExistingVersions = async () => {
    try {
      const response = await fetch('/api/resumes/versions-with-stats')
      if (response.ok) {
        const data = await response.json()
        const names = data.map((v: any) => v.versionName)
        setExistingVersions(names)
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    }
  }

  const getAutoVersionedName = (baseName: string): string => {
    // Check if name already exists
    if (!existingVersions.includes(baseName)) {
      return baseName
    }

    // Extract version number if exists
    const versionMatch = baseName.match(/^(.+?)\s+v(\d+)\.(\d+)$/)

    if (versionMatch) {
      const [, name, major, minor] = versionMatch
      const newMinor = parseInt(minor) + 1
      return `${name} v${major}.${newMinor}`
    } else {
      // No version number, start with v1.0
      return `${baseName} v1.0`
    }
  }

  useEffect(() => {
    if (resumeName) {
      const suggested = getAutoVersionedName(resumeName)
      setSuggestedName(suggested)
    }
  }, [resumeName, existingVersions])

  const handleDownload = async () => {
    if (!resumeName.trim() || !branchName.trim()) {
      return
    }

    setIsDownloading(true)
    try {
      const finalName = getAutoVersionedName(resumeName.trim())
      await onDownload(finalName, branchName.trim())
      onClose()
      setResumeName('')
      setBranchName('')
    } catch (error) {
      console.error('Error downloading:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && resumeName.trim()) {
      handleDownload()
    }
  }

  if (!isOpen) return null

  const nameExists = existingVersions.includes(resumeName.trim())

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <Save className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Save to Lineage</h2>
              <p className="text-sm text-gray-600">Save resume version to your lineage tree</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Resume Name {isBranchedResume && <span className="text-gray-500 text-xs">(Read-only for branched resume)</span>}
            </label>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => !isBranchedResume && setResumeName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Software Engineer Resume"
              className={`w-full px-4 py-3 border-2 rounded-lg text-gray-900 font-medium ${isBranchedResume
                ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                : 'border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2'
                }`}
              autoFocus={!isBranchedResume}
              readOnly={isBranchedResume}
            />
          </div>

          {/* Branch Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Branch Name
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              onKeyPress={handleKeyPress}
              placeholder="e.g., tech-focused, senior-level"
              className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              autoFocus={isBranchedResume}
            />
            <p className="text-xs text-gray-600 mt-1">Use lowercase letters, numbers, and hyphens only</p>
          </div>

          {/* Auto-versioning Info */}
          {nameExists && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    Name already exists
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Will be saved as: <span className="font-bold">{suggestedName}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {!nameExists && resumeName.trim() && (
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    Ready to download
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Will be saved as: <span className="font-bold">{resumeName}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Suggestions - Only show for new resumes */}
          {!isBranchedResume && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Quick Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {['Software Engineer Resume', 'Data Scientist Resume', 'Product Manager Resume'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setResumeName(suggestion)}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t-2 border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!resumeName.trim() || !branchName.trim() || isDownloading}
            className="px-6 py-2.5 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save to Lineage
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

