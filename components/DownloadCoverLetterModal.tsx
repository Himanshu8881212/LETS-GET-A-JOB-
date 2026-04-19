'use client'

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, FileText } from 'lucide-react'

interface DownloadCoverLetterModalProps {
  isOpen: boolean
  onClose: () => void
  onDownload: (name: string, branchName: string) => Promise<void>
  versionId: number
  currentVersionName?: string
  isBranchedCoverLetter?: boolean  // If true, name field is readonly
}

export default function DownloadCoverLetterModal({
  isOpen,
  onClose,
  onDownload,
  versionId,
  currentVersionName = '',
  isBranchedCoverLetter = false
}: DownloadCoverLetterModalProps) {
  const [coverLetterName, setCoverLetterName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [existingVersions, setExistingVersions] = useState<string[]>([])
  const [suggestedName, setSuggestedName] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchExistingVersions()
      // Set initial name from current version
      const baseName = currentVersionName.replace(/\s+v\d+\.\d+$/, '')
      setCoverLetterName(baseName || 'My Cover Letter')
      // Generate default branch name from cover letter name
      if (isBranchedCoverLetter) {
        const defaultBranch = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        setBranchName(defaultBranch || 'new-branch')
      } else {
        setBranchName('main')
      }
    }
  }, [isOpen, currentVersionName, isBranchedCoverLetter])

  const fetchExistingVersions = async () => {
    try {
      const response = await fetch('/api/cover-letters')
      if (response.ok) {
        const data = await response.json()
        const names = data.map((v: any) => v.version_name)
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
    if (coverLetterName) {
      const suggested = getAutoVersionedName(coverLetterName)
      setSuggestedName(suggested)
    }
  }, [coverLetterName, existingVersions])

  const handleDownload = async () => {
    if (!coverLetterName.trim() || !branchName.trim()) {
      return
    }

    setIsDownloading(true)
    try {
      // Don't add version suffix - version_number and branch_name handle versioning
      await onDownload(coverLetterName.trim(), branchName.trim())
      onClose()
      setCoverLetterName('')
      setBranchName('')
    } catch (error) {
      console.error('Error downloading:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && coverLetterName.trim()) {
      handleDownload()
    }
  }

  if (!isOpen) return null

  const nameExists = existingVersions.includes(coverLetterName.trim())

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full rounded-xl border border-brand-border shadow-soft">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-border bg-brand-mist">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-ink flex items-center justify-center">
              <Save className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-ink">Save to Lineage</h2>
              <p className="text-xs text-brand-steel">Save cover letter version to your lineage tree</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand-mist transition-colors"
          >
            <X className="w-5 h-5 text-brand-steel" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-2">
              Cover Letter Name {isBranchedCoverLetter && <span className="text-brand-steel text-xs">(Read-only for branched cover letter)</span>}
            </label>
            <input
              type="text"
              value={coverLetterName}
              onChange={(e) => !isBranchedCoverLetter && setCoverLetterName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Software Engineer Cover Letter"
              className={`w-full px-4 py-3 border text-brand-ink font-medium ${isBranchedCoverLetter
                ? 'border-brand-border bg-brand-mist cursor-not-allowed'
                : 'border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent'
                }`}
              autoFocus={!isBranchedCoverLetter}
              readOnly={isBranchedCoverLetter}
            />
          </div>

          {/* Branch Name Input */}
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-2">
              Branch Name
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              onKeyPress={handleKeyPress}
              placeholder="e.g., tech-focused, senior-level"
              className="w-full px-4 py-3 border border-brand-ink text-brand-ink font-medium focus:outline-none focus:ring-1 focus:ring-brand-accent"
              autoFocus={isBranchedCoverLetter}
            />
            <p className="text-xs text-brand-steel mt-1">Use lowercase letters, numbers, and hyphens only</p>
          </div>

          {/* Info message */}
          {coverLetterName.trim() && branchName.trim() && (
            <div className="bg-brand-mist border border-brand-border p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-brand-slate flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-brand-ink">
                    Ready to save
                  </p>
                  <p className="text-sm text-brand-slate mt-1">
                    Will be saved as: <span className="font-bold">{coverLetterName}</span> ({branchName} branch)
                  </p>
                  <p className="text-xs text-brand-steel mt-1">
                    If this branch and version already exist, it will be overwritten.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-brand-border bg-brand-mist">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-brand-slate hover:bg-brand-mist transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!coverLetterName.trim() || !branchName.trim() || isDownloading}
            className="px-6 py-2.5 text-sm font-semibold bg-brand-ink text-white hover:bg-brand-slate disabled:bg-brand-border disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

