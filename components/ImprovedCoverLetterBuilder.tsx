'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Download, CheckCircle, Eye, GitBranch } from 'lucide-react'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'
import { useAutoSave, loadSavedData, clearSavedData } from '@/hooks/useAutoSave'
import PDFPreviewModal from './PDFPreviewModal'
import CoverLetterLineageDiagram from './CoverLetterLineageDiagram'
import DownloadCoverLetterModal from './DownloadCoverLetterModal'

interface ImprovedCoverLetterBuilderProps {
  onBack: () => void
}

const STORAGE_KEY = 'cover-letter-builder-data'

export default function ImprovedCoverLetterBuilder({ onBack }: ImprovedCoverLetterBuilderProps) {
  const { showToast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Version control state
  const [showLineage, setShowLineage] = useState(false)
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null)
  const [currentVersionName, setCurrentVersionName] = useState<string>('')
  const [currentParentVersionId, setCurrentParentVersionId] = useState<number | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Load saved data on mount
  const [personalInfo, setPersonalInfo] = useState(() => {
    const saved = loadSavedData(STORAGE_KEY, {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      address: ''
    })
    return (saved as any).personalInfo || saved
  })

  const [recipientInfo, setRecipientInfo] = useState(() => {
    const saved = loadSavedData(STORAGE_KEY, {
      company: '',
      role: '',
      hiringManager: '',
      address: '',
      city: ''
    })
    return (saved as any).recipientInfo || saved
  })

  const [openingParagraph, setOpeningParagraph] = useState(() => {
    const saved = loadSavedData(STORAGE_KEY, { openingParagraph: '' })
    return (saved as any).openingParagraph || ''
  })

  const [bodyParagraphs, setBodyParagraphs] = useState<string[]>(() => {
    const saved = loadSavedData(STORAGE_KEY, { bodyParagraphs: [] })
    return (saved as any).bodyParagraphs || []
  })

  const [closingParagraph, setClosingParagraph] = useState(() => {
    const saved = loadSavedData(STORAGE_KEY, { closingParagraph: '' })
    return (saved as any).closingParagraph || ''
  })

  // Auto-save all data
  const allData = {
    personalInfo,
    recipientInfo,
    openingParagraph,
    bodyParagraphs,
    closingParagraph
  }

  useAutoSave({ key: STORAGE_KEY, data: allData, delay: 1000 })

  // Update last saved timestamp when data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLastSaved(new Date())
    }, 1100) // Slightly longer than auto-save delay

    return () => clearTimeout(timer)
  }, [personalInfo, recipientInfo, openingParagraph, bodyParagraphs, closingParagraph])

  const addBodyParagraph = () => {
    if (bodyParagraphs.length < 5) {
      setBodyParagraphs([...bodyParagraphs, ''])
    }
  }

  const removeBodyParagraph = (index: number) => {
    // Allow removing all paragraphs - no minimum required
    setBodyParagraphs(bodyParagraphs.filter((_, i) => i !== index))
  }

  const updateBodyParagraph = (index: number, value: string) => {
    const newParagraphs = [...bodyParagraphs]
    newParagraphs[index] = value
    setBodyParagraphs(newParagraphs)
  }

  // Check if cover letter has any data
  const hasCoverLetterData = () => {
    // Check personal info
    const hasPersonalInfo = Object.values(personalInfo).some((value: unknown) =>
      typeof value === 'string' && value.trim() !== ''
    )

    // Check recipient info
    const hasRecipientInfo = Object.values(recipientInfo).some((value: unknown) =>
      typeof value === 'string' && value.trim() !== ''
    )

    // Check content
    const hasOpening = openingParagraph.trim() !== ''
    const hasBody = bodyParagraphs.some(para => para.trim() !== '')
    const hasClosing = closingParagraph.trim() !== ''

    return hasPersonalInfo || hasRecipientInfo || hasOpening || hasBody || hasClosing
  }

  const handlePreview = async () => {
    setIsGenerating(true)
    try {
      // Transform data to match API expectations
      const apiData = {
        personalInfo,
        recipient: recipientInfo,
        content: {
          opening: openingParagraph,
          bodyParagraphs,
          closing: closingParagraph
        }
      }

      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Cover letter generation error:', errorData)
        throw new Error(errorData.error || 'Failed to generate cover letter')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
      setShowPreview(true)
      showToast('success', 'Preview generated successfully!')
    } catch (error) {
      console.error('Error generating preview:', error)
      showToast('error', error instanceof Error ? error.message : 'Failed to generate preview. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (previewUrl) {
      // Download from existing preview
      const a = document.createElement('a')
      a.href = previewUrl
      a.download = 'cover_letter.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showToast('success', 'Cover letter downloaded successfully!')
      setShowPreview(false)
    } else {
      // Generate and download directly
      setIsGenerating(true)
      try {
        const apiData = {
          personalInfo,
          recipient: recipientInfo,
          content: {
            opening: openingParagraph,
            bodyParagraphs,
            closing: closingParagraph
          }
        }

        const response = await fetch('/api/generate-cover-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        })

        if (!response.ok) {
          throw new Error('Failed to generate cover letter')
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'cover_letter.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        showToast('success', 'Cover letter downloaded successfully!')
      } catch (error) {
        console.error('Error generating cover letter:', error)
        showToast('error', 'Failed to generate cover letter. Please try again.')
      } finally {
        setIsGenerating(false)
      }
    }
  }

  const handleClosePreview = () => {
    setShowPreview(false)
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearSavedData(STORAGE_KEY)

      // Reset all form state
      setPersonalInfo({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        linkedin: '',
        github: '',
        address: ''
      })
      setRecipientInfo({
        company: '',
        role: '',
        hiringManager: '',
        address: '',
        city: ''
      })
      setOpeningParagraph('')
      setBodyParagraphs([''])
      setClosingParagraph('')
      setCurrentVersionId(null)
      setCurrentVersionName('')
      setCurrentParentVersionId(null)

      showToast('info', 'All data cleared')
    }
  }

  // Version control handlers
  const handleSave = () => {
    setShowSaveModal(true)
  }

  const handleModalSave = async (customName: string, branchName: string) => {
    setIsGenerating(true)
    setShowSaveModal(false)

    try {
      // Save cover letter to database (lineage)
      const response = await fetch('/api/cover-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_name: customName,
          data: allData,
          description: `Cover letter version saved on ${new Date().toLocaleDateString()}`,
          parent_version_id: currentParentVersionId || currentVersionId || null,
          branch_name: branchName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save cover letter')
      }

      const savedVersion = await response.json()

      // Update current version tracking
      setCurrentVersionId(savedVersion.id)
      setCurrentVersionName(savedVersion.version_name || customName)
      setCurrentParentVersionId(savedVersion.parent_version_id)

      showToast('success', `Cover letter saved to lineage as ${branchName} branch (${savedVersion.version_number})!`)

      // Refresh lineage if visible
      if (showLineage) {
        setShowLineage(false)
        setTimeout(() => setShowLineage(true), 100)
      }
    } catch (error) {
      console.error('Error saving cover letter:', error)
      showToast('error', 'Failed to save cover letter. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleVersionClick = async (versionId: number) => {
    try {
      const response = await fetch(`/api/cover-letters/${versionId}`)
      if (!response.ok) {
        throw new Error('Failed to load version')
      }

      const version = await response.json()
      const data = version.data

      // Load version data into form
      setPersonalInfo(data.personalInfo || {})
      setRecipientInfo(data.recipientInfo || {})
      setOpeningParagraph(data.openingParagraph || '')
      setBodyParagraphs(data.bodyParagraphs || [])
      setClosingParagraph(data.closingParagraph || '')

      // Update current version tracking
      setCurrentVersionId(version.id)
      setCurrentVersionName(version.version_name)
      setCurrentParentVersionId(version.parent_version_id)

      // Close lineage view
      setShowLineage(false)

      showToast('success', `Loaded version: ${version.version_name}`)
    } catch (error) {
      console.error('Error loading version:', error)
      showToast('error', 'Failed to load version')
    }
  }

  const handleDownloadVersion = async (versionId: number) => {
    try {
      const response = await fetch(`/api/cover-letters/${versionId}/download`)
      if (!response.ok) {
        throw new Error('Failed to download cover letter')
      }

      const blob = await response.blob()

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `cover-letter-v${versionId}.pdf` // fallback
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast('success', 'Cover letter downloaded successfully!')
    } catch (error) {
      console.error('Error downloading cover letter:', error)
      showToast('error', 'Failed to download cover letter')
    }
  }

  const handleCreateBranch = async (versionId: number) => {
    try {
      // Load the version data first
      const response = await fetch(`/api/cover-letters/${versionId}`)
      if (!response.ok) {
        throw new Error('Failed to load version')
      }

      const version = await response.json()
      const data = version.data

      // Load version data into form
      setPersonalInfo(data.personalInfo || {})
      setRecipientInfo(data.recipientInfo || {})
      setOpeningParagraph(data.openingParagraph || '')
      setBodyParagraphs(data.bodyParagraphs || [])
      setClosingParagraph(data.closingParagraph || '')

      // Set parent version for branching
      setCurrentParentVersionId(versionId)
      setCurrentVersionName(version.version_name)

      // Close lineage view to show the builder with loaded data
      setShowLineage(false)
      // DO NOT open save modal yet - let user edit first

      showToast('info', `📝 Branching from: ${version.version_name}. Make your edits and click Save when ready.`)
    } catch (error) {
      console.error('Error creating branch:', error)
      showToast('error', 'Failed to create branch')
    }
  }

  const handleToggleStar = async (versionId: number, currentStarred: boolean) => {
    try {
      const response = await fetch(`/api/cover-letters/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !currentStarred })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle star')
      }

      // Refresh lineage
      setShowLineage(false)
      setTimeout(() => setShowLineage(true), 100)

      showToast('success', currentStarred ? 'Removed from favorites' : 'Added to favorites')
    } catch (error) {
      console.error('Error toggling star:', error)
      showToast('error', 'Failed to update favorite status')
    }
  }

  const handleDeleteVersion = async (versionId: number) => {
    if (!confirm('Are you sure you want to delete this version? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/cover-letters/${versionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete version')
      }

      // Refresh lineage
      setShowLineage(false)
      setTimeout(() => setShowLineage(true), 100)

      showToast('success', 'Version deleted successfully')
    } catch (error) {
      console.error('Error deleting version:', error)
      showToast('error', 'Failed to delete version')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-xl font-bold text-white">
                Cover Letter Builder
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {!showLineage && (
                <>
                  <Button variant="outline" size="md" onClick={handleClearData}>
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    loading={isGenerating}
                    disabled={!hasCoverLetterData()}
                    icon={<Eye className="w-4 h-4" />}
                    onClick={handlePreview}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    loading={isGenerating}
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="md"
                icon={<GitBranch className="w-4 h-4" />}
                onClick={() => setShowLineage(!showLineage)}
              >
                Versions
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Content: Lineage View or Cover Letter Builder */}
      {showLineage ? (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <CoverLetterLineageDiagram
            onVersionClick={handleVersionClick}
            onDownload={handleDownloadVersion}
            onCreateBranch={handleCreateBranch}
            onToggleStar={handleToggleStar}
            onDelete={handleDeleteVersion}
          />
        </div>
      ) : (
        <>
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="space-y-4">
              {/* Personal Information */}
              <section className="bg-white border border-gray-300">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                  <h2 className="text-lg font-bold text-gray-900">
                    Your Information
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">Your contact details for the cover letter header</p>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="First Name"
                      required
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                      maxLength={50}
                      showCharCount
                    />
                    <Input
                      label="Last Name"
                      required
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                      maxLength={50}
                      showCharCount
                    />
                    <Input
                      label="Email"
                      type="email"
                      required
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      maxLength={100}
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      required
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                      maxLength={20}
                    />
                    <Input
                      label="LinkedIn"
                      value={personalInfo.linkedin}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                      maxLength={100}
                    />
                    <Input
                      label="Address"
                      value={personalInfo.address}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                      maxLength={150}
                    />
                  </div>
                </div>
              </section>

              {/* Recipient Information */}
              <section className="bg-white border border-gray-300 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                  <h2 className="text-lg font-bold text-gray-900">
                    Recipient Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Company Name"
                      required
                      value={recipientInfo.company}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, company: e.target.value })}
                      maxLength={100}
                    />
                    <Input
                      label="Position/Role"
                      required
                      value={recipientInfo.role}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, role: e.target.value })}
                      maxLength={100}
                    />
                    <Input
                      label="Hiring Manager"
                      required
                      value={recipientInfo.hiringManager}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, hiringManager: e.target.value })}
                      maxLength={100}
                      helperText="Use 'Hiring Manager' if name is unknown"
                    />
                    <Input
                      label="Company Address"
                      value={recipientInfo.address}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, address: e.target.value })}
                      maxLength={150}
                    />
                    <Input
                      label="City, State ZIP"
                      value={recipientInfo.city}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, city: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                </div>
              </section>

              {/* Opening Paragraph */}
              <section className="bg-white border border-gray-300 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                  <h2 className="text-lg font-bold text-gray-900">
                    Opening Paragraph
                  </h2>
                </div>
                <div className="p-6">
                  <Textarea
                    label="Introduction"
                    required
                    value={openingParagraph}
                    onChange={(e) => setOpeningParagraph(e.target.value)}
                    rows={4}
                    maxLength={600}
                    showCharCount
                    helperText="Introduce yourself and state your interest in the position"
                  />
                </div>
              </section>

              {/* Body Paragraphs */}
              <section className="bg-white border border-gray-300 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Body Paragraphs
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={addBodyParagraph}
                    disabled={bodyParagraphs.length >= 5}
                  >
                    Add Paragraph
                  </Button>
                </div>
                <div className="p-6 space-y-4">
                  {bodyParagraphs.map((paragraph, index) => (
                    <div key={index} className="p-4 bg-gray-50 border border-gray-200 hover:border-gray-400 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-900 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{index + 1}</span>
                          </div>
                          <label className="text-xs font-semibold text-gray-700">
                            Paragraph {index + 1}
                          </label>
                        </div>
                        {bodyParagraphs.length > 1 && (
                          <button
                            onClick={() => removeBodyParagraph(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                      <Textarea
                        value={paragraph}
                        onChange={(e) => updateBodyParagraph(index, e.target.value)}
                        rows={5}
                        maxLength={800}
                        showCharCount
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Closing Paragraph */}
              <section className="bg-white border border-gray-300 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                  <h2 className="text-lg font-bold text-gray-900">
                    Closing Paragraph
                  </h2>
                </div>
                <div className="p-6">
                  <Textarea
                    label="Conclusion"
                    required
                    value={closingParagraph}
                    onChange={(e) => setClosingParagraph(e.target.value)}
                    rows={4}
                    maxLength={600}
                    showCharCount
                    helperText="Express gratitude and indicate your availability for follow-up"
                  />
                </div>
              </section>

            </div>
          </div>

          {/* PDF Preview Modal */}
          <PDFPreviewModal
            isOpen={showPreview}
            onClose={handleClosePreview}
            pdfUrl={previewUrl}
            title="Cover Letter Preview"
            onDownload={handleDownload}
          />
        </>
      )}

      {/* Save Modal */}
      <DownloadCoverLetterModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onDownload={handleModalSave}
        versionId={currentVersionId || 0}
        currentVersionName={currentVersionName}
        isBranchedCoverLetter={!!currentParentVersionId}
      />
    </div>
  )
}
