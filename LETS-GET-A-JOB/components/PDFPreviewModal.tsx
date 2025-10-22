'use client'

import { X, Download } from 'lucide-react'
import { Button } from './ui/Button'

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string | null
  title: string
  onDownload: () => void
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  onDownload
}: PDFPreviewModalProps) {
  if (!isOpen || !pdfUrl) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden transform transition-all border-2 border-gray-900">
          {/* Header - Black/White/Grey Theme */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-900 bg-black">
            <div>
              <h2 className="text-2xl font-bold text-white">
                PDF Preview
              </h2>
              <p className="text-sm text-gray-400 mt-1">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-6 h-6 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            <div className="w-full h-full bg-white shadow-inner overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

