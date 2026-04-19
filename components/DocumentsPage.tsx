'use client'

import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Upload, Trash2, Download, FileText, File, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { useToast } from './ui/Toast'

const CATEGORIES = [
  { id: 'transcript', label: 'Transcript' },
  { id: 'certification', label: 'Certification' },
  { id: 'reference', label: 'Reference' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'work_sample', label: 'Work Sample' },
  { id: 'identity', label: 'ID / Eligibility' },
  { id: 'other', label: 'Other' },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']
const HIDDEN_CATEGORIES = new Set(['resume', 'cover_letter'])

interface ApiDoc {
  id: number
  name: string
  category: CategoryId
  mime_type: string | null
  size: number | null
  description: string | null
  created_at: string
}

interface DocumentsPageProps {
  onBack: () => void
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find(c => c.id === id)?.label || id
}

export default function DocumentsPage({ onBack }: DocumentsPageProps) {
  const { showToast } = useToast()
  const [documents, setDocuments] = useState<ApiDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<CategoryId>('certification')
  const [uploadDescription, setUploadDescription] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      const all: ApiDoc[] = data.documents || []
      setDocuments(all.filter(d => !HIDDEN_CATEGORIES.has(d.category as string)))
    } catch (e: any) {
      showToast('error', 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', uploadCategory)
      if (uploadDescription.trim()) fd.append('description', uploadDescription.trim())
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Upload failed')
      setDocuments(prev => [data, ...prev])
      setUploadDescription('')
      showToast('success', `Uploaded ${data.name}`)
    } catch (e: any) {
      showToast('error', e?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (doc: ApiDoc) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      showToast('success', 'Document deleted')
    } catch (e: any) {
      showToast('error', e?.message || 'Delete failed')
    }
  }

  const grouped = CATEGORIES.map(c => ({
    category: c,
    docs: documents.filter(d => d.category === c.id),
  })).filter(g => g.docs.length)

  if (loading) {
    return (
      <div className="flex-1 bg-brand-mist/20 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-3" />
          <p className="text-brand-steel text-sm">Loading documents…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-brand-mist/20 flex flex-col h-full overflow-hidden">
      <div className="h-[72px] px-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-brand-mist rounded-lg transition-colors" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5 text-brand-ink" />
          </button>
          <div>
            <h2 className="font-display font-bold text-brand-ink leading-tight">Documents</h2>
            <p className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Supporting files the Apply agent can attach</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <section className="rounded-xl border border-brand-border bg-white shadow-soft p-5">
          <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1">Upload new</div>
          <h2 className="text-lg font-semibold text-brand-ink">Application Bundle</h2>
          <p className="text-sm text-brand-steel mt-1">
            Supporting files the Apply agent can attach: transcripts, certifications, references, portfolio samples, identity docs. Resumes and cover letters are managed in their own tabs with full version history.
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3">
            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Category</span>
              <select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value as CategoryId)}
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Description (optional)</span>
              <input
                type="text"
                value={uploadDescription}
                onChange={e => setUploadDescription(e.target.value)}
                placeholder="e.g. AWS SA Pro — Nov 2024"
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </label>
            <div className="flex items-end">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                loading={uploading}
                icon={<Upload className="w-4 h-4" />}
              >
                Upload file
              </Button>
            </div>
          </div>
          <p className="text-xs text-brand-steel mt-3">
            Max 15 MB per file. PDFs preferred for résumés, transcripts, and certificates.
          </p>
        </section>

        {documents.length === 0 ? (
          <section className="rounded-xl border border-dashed border-brand-border bg-white p-10 text-center">
            <FileText className="w-10 h-10 text-brand-steel mx-auto mb-3" />
            <h3 className="text-base font-semibold text-brand-ink">No documents yet</h3>
            <p className="text-sm text-brand-steel mt-1 max-w-md mx-auto">
              Upload a transcript, certification, or portfolio sample to have the Apply agent attach it for you.
            </p>
          </section>
        ) : (
          grouped.map(({ category, docs }) => (
            <section key={category.id} className="rounded-xl border border-brand-border bg-white shadow-soft overflow-hidden">
              <div className="px-5 py-3 bg-brand-mist border-b border-brand-border flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.18em] text-brand-steel font-semibold">
                  {category.label}
                </div>
                <span className="text-xs text-brand-steel">{docs.length} {docs.length === 1 ? 'file' : 'files'}</span>
              </div>
              <div className="divide-y divide-brand-border">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-3 hover:bg-brand-mist/60 transition-colors">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-mist flex items-center justify-center">
                      <File className="w-4 h-4 text-brand-slate" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-brand-ink truncate">{doc.name}</div>
                      <div className="text-xs text-brand-steel">
                        {formatSize(doc.size)} · {formatDate(doc.created_at)}
                        {doc.description ? ` · ${doc.description}` : ''}
                      </div>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}/file`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 rounded-full border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-slate hover:bg-brand-mist hover:border-brand-steel transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
