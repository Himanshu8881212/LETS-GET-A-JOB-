'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Download, CheckCircle, Eye } from 'lucide-react'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'
import { useAutoSave, loadSavedData, clearSavedData } from '@/hooks/useAutoSave'
import PDFPreviewModal from './PDFPreviewModal'

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })

      if (!response.ok) {
        throw new Error('Failed to generate cover letter')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
      setShowPreview(true)
      showToast('success', 'Preview generated successfully!')
    } catch (error) {
      console.error('Error generating preview:', error)
      showToast('error', 'Failed to generate preview. Please try again.')
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
      showToast('info', 'All data cleared')
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - DataGen Black/White/Grey Theme */}
      <div className="bg-black border-b border-gray-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-all font-medium shadow-sm hover:shadow border border-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <div className="h-8 w-px bg-gray-700"></div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Cover Letter Builder
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Professional Cover Letter • ATS-Compatible Format</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastSaved && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-gray-300 rounded-lg text-sm font-medium border border-gray-700 shadow-sm">
                  <CheckCircle className="w-4 h-4" />
                  Auto-saved
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleClearData}>
                Clear All
              </Button>
              <Button
                variant="secondary"
                size="md"
                loading={isGenerating}
                icon={<Eye className="w-5 h-5" />}
                onClick={handlePreview}
              >
                {isGenerating ? 'Generating...' : 'Preview PDF'}
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={isGenerating}
                icon={<Download className="w-5 h-5" />}
                onClick={handleDownload}
              >
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>
        {/* Progress bar when generating */}
        {isGenerating && (
          <div className="h-1 bg-gray-900">
            <div className="h-full bg-white animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Quick Tips Banner */}
        <div className="mb-6 bg-gray-100 border-2 border-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Quick Tips for a Great Cover Letter</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                  <span><strong>Opening:</strong> State the position and express enthusiasm</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                  <span><strong>Body:</strong> Highlight relevant skills and achievements</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                  <span><strong>Closing:</strong> Thank them and request an interview</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">

          {/* Personal Information */}
          <section className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden">
            <div className="px-8 py-5 bg-black border-b-2 border-gray-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="w-1.5 h-6 bg-white rounded-full"></div>
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
          <section className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden">
            <div className="px-8 py-5 bg-black border-b-2 border-gray-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="w-1.5 h-6 bg-white rounded-full"></div>
                Recipient Information
              </h2>
              <p className="text-gray-400 text-sm mt-1">Details about the company and position you're applying for</p>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <section className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden">
            <div className="px-8 py-5 bg-black border-b-2 border-gray-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="w-1.5 h-6 bg-white rounded-full"></div>
                Opening Paragraph
              </h2>
              <p className="text-gray-400 text-sm mt-1">Introduce yourself and express your interest in the position</p>
            </div>
            <div className="p-8">
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
          <section className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden">
            <div className="px-8 py-5 bg-black border-b-2 border-gray-900 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-white rounded-full"></div>
                  Body Paragraphs
                </h2>
                <p className="text-gray-400 text-sm mt-1">Highlight your qualifications and fit for the role (1-5 paragraphs)</p>
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
            <div className="p-8 space-y-5">
              {bodyParagraphs.map((paragraph, index) => (
                <div key={index} className="p-5 bg-gray-50 border-2 border-gray-900 rounded-lg hover:border-black transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white border-2 border-black rounded-lg flex items-center justify-center">
                        <span className="text-black font-bold text-sm">{index + 1}</span>
                      </div>
                      <label className="text-sm font-semibold text-gray-700">
                        Paragraph {index + 1}
                      </label>
                    </div>
                    {bodyParagraphs.length > 1 && (
                      <button
                        onClick={() => removeBodyParagraph(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
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
          <section className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden">
            <div className="px-8 py-5 bg-black border-b-2 border-gray-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="w-1.5 h-6 bg-white rounded-full"></div>
                Closing Paragraph
              </h2>
              <p className="text-gray-400 text-sm mt-1">Express gratitude and indicate your availability for follow-up</p>
            </div>
            <div className="p-8">
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
    </div>
  )
}
