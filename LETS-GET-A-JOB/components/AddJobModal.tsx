'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { JobApplication, JobStatus } from '@/types/job-tracker'

interface AddJobModalProps {
  onClose: () => void
  onAdd: (job: JobApplication) => void
  initialData?: {
    company?: string
    position?: string
    jobUrl?: string
    jobDescription?: string
    resumeVersionId?: number | null
    coverLetterVersionId?: number | null
  }
}

interface VersionNode {
  id: number
  version_name: string
  version_number: string
  branch_name: string
  parent_version_id: number | null
  children: VersionNode[]
}

export default function AddJobModal({ onClose, onAdd, initialData }: AddJobModalProps) {
  const [resumeVersions, setResumeVersions] = useState<VersionNode[]>([])
  const [coverLetterVersions, setCoverLetterVersions] = useState<VersionNode[]>([])
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [lastUsedResumeId, setLastUsedResumeId] = useState<number | null>(null)
  const [lastUsedCoverLetterId, setLastUsedCoverLetterId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    company: initialData?.company || '',
    position: initialData?.position || '',
    status: 'applied' as JobStatus,
    applicationDate: new Date().toISOString().split('T')[0],
    jobUrl: initialData?.jobUrl || '', // MANDATORY
    location: '',
    notes: initialData?.jobDescription || '',
    resumeVersionId: initialData?.resumeVersionId || null,
    coverLetterVersionId: initialData?.coverLetterVersionId || null,
  })

  // Load versions and last used on mount
  useEffect(() => {
    fetchResumeVersions()
    fetchCoverLetterVersions()
    loadLastUsedResume()
    loadLastUsedCoverLetter()
  }, [])

  const fetchResumeVersions = async () => {
    try {
      const response = await fetch('/api/resumes/lineage')
      if (response.ok) {
        const lineage = await response.json()
        setResumeVersions(lineage)
      }
    } catch (error) {
      console.error('Error fetching resume versions:', error)
    } finally {
      setLoadingVersions(false)
    }
  }

  const fetchCoverLetterVersions = async () => {
    try {
      const response = await fetch('/api/cover-letters/lineage')
      if (response.ok) {
        const lineage = await response.json()
        setCoverLetterVersions(lineage)
      }
    } catch (error) {
      console.error('Error fetching cover letter versions:', error)
    }
  }

  const loadLastUsedResume = () => {
    const lastUsed = localStorage.getItem('lastUsedResumeId')
    if (lastUsed) {
      const resumeId = parseInt(lastUsed)
      setLastUsedResumeId(resumeId)
      setFormData(prev => ({ ...prev, resumeVersionId: resumeId }))
    }
  }

  const loadLastUsedCoverLetter = () => {
    const lastUsed = localStorage.getItem('lastUsedCoverLetterId')
    if (lastUsed) {
      const coverLetterId = parseInt(lastUsed)
      setLastUsedCoverLetterId(coverLetterId)
      setFormData(prev => ({ ...prev, coverLetterVersionId: coverLetterId }))
    }
  }

  const saveLastUsedResume = (resumeId: number) => {
    localStorage.setItem('lastUsedResumeId', resumeId.toString())
  }

  const saveLastUsedCoverLetter = (coverLetterId: number) => {
    localStorage.setItem('lastUsedCoverLetterId', coverLetterId.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const jobData = {
      company: formData.company,
      position: formData.position,
      status: formData.status,
      application_date: formData.applicationDate,
      job_url: formData.jobUrl, // MANDATORY
      location: formData.location || undefined,
      notes: formData.notes,
      resume_version_id: formData.resumeVersionId || undefined,
      cover_letter_version_id: formData.coverLetterVersionId || undefined,
    }

    // Save last used versions for next time
    if (formData.resumeVersionId) {
      saveLastUsedResume(formData.resumeVersionId)
    }
    if (formData.coverLetterVersionId) {
      saveLastUsedCoverLetter(formData.coverLetterVersionId)
    }

    onAdd(jobData as any)
    onClose()
  }

  // Flatten the tree structure for dropdown display
  const flattenVersions = (versions: VersionNode[], depth = 0): Array<{ version: VersionNode; depth: number }> => {
    const result: Array<{ version: VersionNode; depth: number }> = []

    versions.forEach(version => {
      result.push({ version, depth })
      if (version.children && version.children.length > 0) {
        result.push(...flattenVersions(version.children, depth + 1))
      }
    })

    return result
  }

  // Get all flattened versions
  const allResumeVersions = flattenVersions(resumeVersions)
  const allCoverLetterVersions = flattenVersions(coverLetterVersions)

  // Sort versions: last used first, then by creation date (newest first)
  const sortedResumeVersions = [...allResumeVersions].sort((a, b) => {
    if (a.version.id === lastUsedResumeId) return -1
    if (b.version.id === lastUsedResumeId) return 1
    return 0
  })

  const sortedCoverLetterVersions = [...allCoverLetterVersions].sort((a, b) => {
    if (a.version.id === lastUsedCoverLetterId) return -1
    if (b.version.id === lastUsedCoverLetterId) return 1
    return 0
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-300">
        {/* Header */}
        <div className="bg-gray-900 text-white p-5 flex justify-between items-center border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">Add New Application</h2>
            <p className="text-gray-400 text-sm mt-0.5">Track your job application</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
                placeholder="Google, Microsoft, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
                placeholder="Software Engineer, Product Manager..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as JobStatus })}
                className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
              >
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Application Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.applicationDate}
                onChange={e => setFormData({ ...formData, applicationDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
              />
            </div>
          </div>

          {/* Job URL - Now Mandatory */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">
              Job URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.jobUrl}
              onChange={e => setFormData({ ...formData, jobUrl: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
              placeholder="https://company.com/jobs/123"
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
                placeholder="San Francisco, CA / Remote"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Resume Version
              </label>
              {loadingVersions ? (
                <div className="w-full px-3 py-2.5 border border-gray-300 text-sm text-gray-500">
                  Loading versions...
                </div>
              ) : (
                <select
                  value={formData.resumeVersionId || ''}
                  onChange={e => setFormData({ ...formData, resumeVersionId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
                >
                  <option value="">No resume selected</option>
                  {sortedResumeVersions.map(({ version, depth }) => (
                    <option key={version.id} value={version.id}>
                      {version.id === lastUsedResumeId && '⭐ '}
                      {'  '.repeat(depth)}
                      {depth > 0 && '└─ '}
                      {version.version_number} - {version.version_name} ({version.branch_name})
                    </option>
                  ))}
                </select>
              )}
              {lastUsedResumeId && formData.resumeVersionId === lastUsedResumeId && (
                <p className="text-xs text-gray-500 mt-1">⭐ Last used resume</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Cover Letter Version
              </label>
              {loadingVersions ? (
                <div className="w-full px-3 py-2.5 border border-gray-300 text-sm text-gray-500">
                  Loading versions...
                </div>
              ) : (
                <select
                  value={formData.coverLetterVersionId || ''}
                  onChange={e => setFormData({ ...formData, coverLetterVersionId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black"
                >
                  <option value="">No cover letter selected</option>
                  {sortedCoverLetterVersions.map(({ version, depth }) => (
                    <option key={version.id} value={version.id}>
                      {version.id === lastUsedCoverLetterId && '⭐ '}
                      {'  '.repeat(depth)}
                      {depth > 0 && '└─ '}
                      {version.version_number} - {version.version_name} ({version.branch_name})
                    </option>
                  ))}
                </select>
              )}
              {lastUsedCoverLetterId && formData.coverLetterVersionId === lastUsedCoverLetterId && (
                <p className="text-xs text-gray-500 mt-1">⭐ Last used cover letter</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 transition-colors text-sm text-black resize-none"
                placeholder="Quick notes about this application..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              Add Application
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

