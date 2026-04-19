'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Info, Loader2, Upload } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'

interface AICoverLetterGeneratorProps {
  onBack: () => void
  onGenerate: (data: any) => void
}

interface ResumeVersionRow {
  id: number
  version_name: string
  version_number: string
  branch_name: string
  data?: any
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AICoverLetterGenerator({ onBack, onGenerate }: AICoverLetterGeneratorProps) {
  const [profileMode, setProfileMode] = useState<'version' | 'upload' | 'text'>('version')
  const [versions, setVersions] = useState<ResumeVersionRow[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<number | ''>('')
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [profileText, setProfileText] = useState('')

  const [jdMode, setJdMode] = useState<'url' | 'text'>('url')
  const [jdUrl, setJdUrl] = useState('')
  const [jdText, setJdText] = useState('')

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/resumes')
        if (!res.ok) return
        const rows: ResumeVersionRow[] = await res.json()
        setVersions(rows)
        if (rows.length > 0) setSelectedVersionId(rows[0].id)
        else setProfileMode('upload')
      } catch {
        /* allow upload/paste fallback */
      }
    })()
  }, [])

  async function resolveProfile(): Promise<string | object> {
    if (profileMode === 'version') {
      const v = versions.find(x => x.id === selectedVersionId)
      if (!v) throw new Error('Pick a resume version')
      return v.data ?? {}
    }
    if (profileMode === 'upload') {
      if (!profileFile) throw new Error('Upload a resume PDF')
      setStatus('Extracting text from PDF…')
      const pdfBase64 = await fileToBase64(profileFile)
      const res = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, fileName: profileFile.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to parse PDF')
      if (!data.output) throw new Error('PDF had no extractable text')
      return data.output as string
    }
    if (!profileText.trim()) throw new Error('Paste your resume content')
    return profileText
  }

  const handleGenerate = async () => {
    setError(null)
    setStatus(null)
    if (jdMode === 'url' && !jdUrl.trim()) return setError('Provide a Job Description URL')
    if (jdMode === 'text' && !jdText.trim()) return setError('Paste the Job Description text')

    setLoading(true)
    try {
      const profile = await resolveProfile()
      setStatus('Generating cover letter…')
      const body: Record<string, any> = { profile_text: profile }
      if (jdMode === 'url') body.jd_url = jdUrl.trim()
      else body.job_description = jdText.trim()

      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to generate cover letter')
      setPreview(data)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
      setStatus(null)
    }
  }

  const Pill = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        active ? 'bg-brand-ink text-white' : 'text-brand-slate hover:bg-brand-mist'
      }`}
    >
      {children}
    </button>
  )

  if (preview) {
    const meta = preview?._metadata || {}
    const body = Array.isArray(preview?.bodyParagraphs) ? preview.bodyParagraphs : []
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setPreview(null)} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-brand-ink">Review cover letter</h1>
        </div>
        <div className="bg-white border border-brand-border rounded-xl p-6 shadow-soft space-y-5">
          <div className="flex items-start gap-2 rounded-xl bg-brand-mist/60 border border-brand-border p-3 text-sm text-brand-slate">
            <Info className="w-4 h-4 mt-0.5 text-brand-steel flex-shrink-0" />
            <div>
              Quill used your resume as the source of facts and the job description as the emphasis target. Preview below before applying to your builder.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-brand-border bg-white p-4">
              <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Target role</div>
              <div className="mt-1 text-sm font-semibold text-brand-ink truncate">{meta.target_role || '—'}</div>
            </div>
            <div className="rounded-xl border border-brand-border bg-white p-4">
              <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Company</div>
              <div className="mt-1 text-sm font-semibold text-brand-ink truncate">{meta.target_company || '—'}</div>
            </div>
            <div className="rounded-xl border border-brand-border bg-white p-4">
              <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">Word count</div>
              <div className="mt-1 text-sm font-semibold text-brand-ink">{meta.word_count ?? '—'}</div>
            </div>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-mist/40 p-4 text-sm text-brand-slate max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {preview.openingParagraph ? preview.openingParagraph + '\n\n' : ''}
            {body.join('\n\n')}
            {preview.closingParagraph ? '\n\n' + preview.closingParagraph : ''}
          </div>
          {Array.isArray(meta.keywords_incorporated) && meta.keywords_incorporated.length > 0 && (
            <div>
              <div className="text-xs font-medium text-brand-slate mb-1.5">JD keywords incorporated</div>
              <div className="flex flex-wrap gap-1.5">
                {meta.keywords_incorporated.map((k: string, i: number) => (
                  <span key={i} className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">{k}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
            <Button variant="outline" size="md" onClick={() => setPreview(null)}>Back and retry</Button>
            <Button onClick={() => onGenerate(preview)} icon={<Check className="w-4 h-4" />}>
              Apply to builder
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Builder
        </Button>
        <h1 className="text-2xl font-bold text-brand-ink">AI Cover Letter Generator</h1>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-brand-mist/60 border border-brand-border p-3 text-sm text-brand-slate">
        <Info className="w-4 h-4 mt-0.5 text-brand-steel flex-shrink-0" />
        <div>
          <strong className="text-brand-ink">How it works:</strong> The AI reads your resume (source of facts — achievements, companies, dates) and the job description (drives emphasis — hook, which achievements to lead with, cultural signals). It never invents experience. You'll see a full preview before anything touches your builder.
        </div>
      </div>

      <div className="bg-white border border-brand-border rounded-xl p-6 shadow-soft space-y-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-brand-ink">1. Source Resume</h3>
            <div className="inline-flex rounded-full border border-brand-border bg-white p-0.5">
              <Pill active={profileMode === 'version'} onClick={() => setProfileMode('version')}>From versions</Pill>
              <Pill active={profileMode === 'upload'} onClick={() => setProfileMode('upload')}>Upload PDF</Pill>
              <Pill active={profileMode === 'text'} onClick={() => setProfileMode('text')}>Paste text</Pill>
            </div>
          </div>
          <p className="text-xs text-brand-steel mb-2">The cover letter is generated from your resume — pick the version you want to ground it in.</p>
          {profileMode === 'version' && (
            versions.length > 0 ? (
              <select
                value={selectedVersionId}
                onChange={e => setSelectedVersionId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              >
                <option value="">— select a resume version —</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.version_name} ({v.version_number} · {v.branch_name})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-brand-steel">No saved resume versions yet. Upload a PDF or paste text instead.</p>
            )
          )}
          {profileMode === 'upload' && (
            <label
              htmlFor="ai-cl-upload"
              className="rounded-xl border-2 border-dashed border-brand-border hover:border-brand-ink transition-colors p-6 text-center cursor-pointer flex flex-col items-center"
            >
              <input
                id="ai-cl-upload"
                type="file"
                accept=".pdf"
                onChange={e => setProfileFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Upload className="w-7 h-7 text-brand-steel mb-2" />
              <div className="text-sm font-medium text-brand-slate">
                {profileFile ? profileFile.name : 'Click to upload a resume PDF'}
              </div>
              <div className="text-xs text-brand-steel mt-1">PDF only · extracted + cleaned before generation</div>
            </label>
          )}
          {profileMode === 'text' && (
            <Textarea
              placeholder="Paste your resume text…"
              className="h-48 font-mono text-sm"
              value={profileText}
              onChange={e => setProfileText(e.target.value)}
            />
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-brand-ink">2. Target Job Description</h3>
            <div className="inline-flex rounded-full border border-brand-border bg-white p-0.5">
              <Pill active={jdMode === 'url'} onClick={() => setJdMode('url')}>URL</Pill>
              <Pill active={jdMode === 'text'} onClick={() => setJdMode('text')}>Paste text</Pill>
            </div>
          </div>
          {jdMode === 'url' ? (
            <>
              <Input
                placeholder="https://linkedin.com/jobs/view/..."
                value={jdUrl}
                onChange={e => setJdUrl(e.target.value)}
              />
              <p className="text-xs text-brand-steel mt-2">
                If a site blocks automated fetches, switch to{' '}
                <button type="button" onClick={() => setJdMode('text')} className="text-brand-ink underline">Paste text</button>.
              </p>
            </>
          ) : (
            <Textarea
              placeholder="Paste the full job description here…"
              className="h-40 text-sm"
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
          )}
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-brand-border">
          <div className="text-xs text-brand-steel">
            {loading && status ? status : 'Output populates your cover letter fields; you can edit after.'}
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="min-w-[170px]">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate Cover Letter'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
