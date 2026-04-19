'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Download, CheckCircle, Eye, GitBranch } from 'lucide-react'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { WandButton } from './ui/WandButton'
import { useToast } from './ui/Toast'
import { useAutoSave, loadSavedData, clearSavedData } from '@/hooks/useAutoSave'
import PDFPreviewModal from './PDFPreviewModal'
import CoverLetterLineageDiagram from './CoverLetterLineageDiagram'
import DownloadCoverLetterModal from './DownloadCoverLetterModal'
import AICoverLetterGenerator from './AICoverLetterGenerator'

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
  const [showAI, setShowAI] = useState(false)

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

  if (showAI) {
    return (
      <div className="min-h-screen bg-brand-mist/20">
        <AICoverLetterGenerator
          onBack={() => setShowAI(false)}
          onGenerate={(data: any) => {
            if (data.personalInfo) setPersonalInfo({ ...personalInfo, ...data.personalInfo })
            if (data.recipientInfo) setRecipientInfo({ ...recipientInfo, ...data.recipientInfo })
            if (typeof data.openingParagraph === 'string') setOpeningParagraph(data.openingParagraph)
            if (Array.isArray(data.bodyParagraphs)) setBodyParagraphs(data.bodyParagraphs)
            if (typeof data.closingParagraph === 'string') setClosingParagraph(data.closingParagraph)
            showToast('success', 'Cover letter generated')
            setShowAI(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-mist/20">
      {/* Header */}
      <div className="h-[72px] px-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-brand-mist rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-brand-ink" />
          </button>
          <h1 className="text-xl font-bold text-brand-ink">
            Cover Letter
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
                    onClick={() => setShowAI(true)}
                  >
                    AI
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
          {(() => {
            const yourInfoComplete = !!(personalInfo.firstName && personalInfo.lastName && personalInfo.email && personalInfo.phone)
            const recipientComplete = !!(recipientInfo.company && recipientInfo.role && recipientInfo.hiringManager)
            const openingComplete = openingParagraph.trim().length >= 40
            const bodyComplete = bodyParagraphs.some(p => p.trim().length >= 40)
            const closingComplete = closingParagraph.trim().length >= 40

            const sidebarRows: { id: string; label: string; complete: boolean }[] = [
              { id: 'your-info', label: 'Your Information', complete: yourInfoComplete },
              { id: 'recipient', label: 'Recipient', complete: recipientComplete },
              { id: 'opening', label: 'Opening', complete: openingComplete },
              { id: 'body', label: 'Body', complete: bodyComplete },
              { id: 'closing', label: 'Closing', complete: closingComplete },
            ]

            return (
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <aside className="lg:col-span-1">
                <div className="bg-white border border-brand-border rounded-xl shadow-soft sticky top-[88px]">
                  <div className="px-4 py-3 bg-brand-mist border-b border-brand-border">
                    <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Sections</div>
                    <p className="text-xs text-brand-steel mt-1">Click to jump</p>
                  </div>
                  <div className="p-2">
                    {sidebarRows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => document.getElementById(row.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm text-brand-slate hover:bg-brand-mist transition-colors"
                      >
                        <span className={`inline-flex w-4 h-4 rounded-full border-2 ${row.complete ? 'bg-brand-ink border-brand-ink' : 'bg-white border-brand-border'}`} aria-hidden />
                        <span className="flex-1">{row.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
              <div className="lg:col-span-3 space-y-4">
              {/* Personal Information */}
              <section id="your-info" className="bg-white border border-brand-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 bg-brand-mist border-b border-brand-border">
                  <h2 className="text-lg font-semibold text-brand-ink">
                    Your Information
                  </h2>
                  <p className="text-sm text-brand-steel mt-1">Your contact details for the cover letter header</p>
                </div>
                <div className="p-6">
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
              <section id="recipient" className="bg-white border border-brand-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 bg-brand-mist border-b border-brand-border">
                  <h2 className="text-lg font-semibold text-brand-ink">
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
              <section id="opening" className="bg-white border border-brand-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-brand-ink">
                    Opening Paragraph
                  </h2>
                  <WandButton
                    kind="cover_letter_opening"
                    content={openingParagraph}
                    context={{ companyName: recipientInfo.company, targetRole: recipientInfo.role }}
                    onPolished={setOpeningParagraph}
                    title="Polish this opening"
                  />
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
              <section id="body" className="bg-white border border-brand-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-brand-ink">
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
                    <div key={index} className="rounded-xl bg-brand-mist border border-brand-border p-5 hover:border-brand-steel transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-ink flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{index + 1}</span>
                          </div>
                          <label className="text-xs font-semibold text-brand-slate">
                            Paragraph {index + 1}
                          </label>
                        </div>
                        <div className="flex items-center gap-1">
                          <WandButton
                            kind="cover_letter_body"
                            content={paragraph}
                            context={{ companyName: recipientInfo.company, targetRole: recipientInfo.role }}
                            onPolished={(p) => updateBodyParagraph(index, p)}
                            title="Polish this paragraph"
                          />
                          {bodyParagraphs.length > 1 && (
                            <button
                              onClick={() => removeBodyParagraph(index)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full px-2.5 py-1 transition-colors flex items-center gap-1 text-xs font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          )}
                        </div>
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
              <section id="closing" className="bg-white border border-brand-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 bg-brand-mist border-b border-brand-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-brand-ink">
                      Closing Paragraph
                    </h2>
                    <WandButton
                      kind="cover_letter_closing"
                      content={closingParagraph}
                      context={{ companyName: recipientInfo.company, targetRole: recipientInfo.role }}
                      onPolished={setClosingParagraph}
                      title="Polish this closing"
                    />
                  </div>
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
          </div>
            )
          })()}

          {/* PDF Preview Modal */}
          <PDFPreviewModal
            isOpen={showPreview}
            onClose={handleClosePreview}
            pdfUrl={previewUrl}
            title={currentVersionName || 'Cover Letter'}
            onDownload={handleDownload}
            docType="cover-letter"
            data={{
              personalInfo,
              recipient: recipientInfo,
              content: {
                opening: openingParagraph,
                bodyParagraphs,
                closing: closingParagraph,
              },
            }}
            fileBaseName={currentVersionName || 'cover-letter'}
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
