'use client'

import { useState } from 'react'
import { X, Download, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string | null
  title: string
  /** PDF download handler (backward compat — used for the PDF button). */
  onDownload: () => void
  /** Document kind — controls which /api/generate-*-docx endpoint the Word button hits. */
  docType?: 'resume' | 'cover-letter'
  /** JSON payload that produced the PDF — reused to request the Word version. */
  data?: unknown
  /** Base filename (no extension) for downloads. Falls back to the title. */
  fileBaseName?: string
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  onDownload,
  docType,
  data,
  fileBaseName,
}: PDFPreviewModalProps) {
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const { showToast } = useToast()

  if (!isOpen || !pdfUrl) return null

  const safeBase =
    (fileBaseName || title || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'document'

  const canDownloadDocx = !!(docType && data)

  const downloadDocx = async () => {
    if (!canDownloadDocx) return
    const endpoint =
      docType === 'resume'
        ? '/api/generate-resume-docx'
        : '/api/generate-cover-letter-docx'
    setDownloadingDocx(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Failed to generate Word file')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeBase}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to download Word file')
    } finally {
      setDownloadingDocx(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden rounded-xl border border-brand-border shadow-soft">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border bg-brand-mist">
            <div>
              <h2 className="text-lg font-bold text-brand-ink">Preview</h2>
              <p className="text-xs text-brand-steel mt-1">{title}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-slate transition-colors"
                title="Download as PDF"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
              {canDownloadDocx && (
                <button
                  onClick={downloadDocx}
                  disabled={downloadingDocx}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-4 py-1.5 text-xs font-semibold text-brand-ink hover:border-brand-ink hover:bg-brand-mist transition-colors disabled:opacity-60"
                  title="Download as Word (.docx)"
                >
                  {downloadingDocx ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  Word
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white transition-colors rounded-full"
                aria-label="Close preview"
              >
                <X className="w-5 h-5 text-brand-steel" />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden bg-brand-mist">
            <div className="w-full h-full bg-white shadow-inner overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
