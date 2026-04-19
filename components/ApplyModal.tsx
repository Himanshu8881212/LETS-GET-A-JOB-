'use client'

import { useEffect, useState } from 'react'
import { X, Check, ExternalLink, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { useToast } from './ui/Toast'

interface ResumeVersion {
  id: number
  version_name: string
  version_number: string
  branch_name: string
}

interface CLVersion {
  id: number
  version_name: string
}

interface AppDoc {
  id: number
  name: string
  category: string
  size: number | null
}

export interface ApplyModalProps {
  open: boolean
  onClose: () => void
  initialJobUrl?: string
  initialJobDescription?: string
  /** If known, preselect these version ids */
  initialResumeVersionId?: number | null
  initialCoverLetterVersionId?: number | null
}

interface AgentResult {
  ok: boolean
  jobUrl: string
  finalUrl?: string
  attachments: Array<{ role: string; name: string }>
  uploadedFiles?: string[]
  steps: Array<{ action?: string; args?: string }>
  summary?: string
  message: string
  error?: string
}

export default function ApplyModal(props: ApplyModalProps) {
  const { showToast } = useToast()
  const [jobUrl, setJobUrl] = useState(props.initialJobUrl || '')
  const [resumes, setResumes] = useState<ResumeVersion[]>([])
  const [coverLetters, setCoverLetters] = useState<CLVersion[]>([])
  const [docs, setDocs] = useState<AppDoc[]>([])
  const [resumeId, setResumeId] = useState<number | ''>(props.initialResumeVersionId ?? '')
  const [coverId, setCoverId] = useState<number | ''>(props.initialCoverLetterVersionId ?? '')
  const [docIds, setDocIds] = useState<Set<number>>(new Set())

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)

  useEffect(() => {
    if (!props.open) return
    setResult(null)
    ;(async () => {
      try {
        const [r, c, d] = await Promise.all([
          fetch('/api/resume-versions').then(r => r.json()),
          fetch('/api/cover-letter-versions').then(r => r.json()),
          fetch('/api/documents').then(r => r.json()),
        ])
        const rv: ResumeVersion[] = (r.versions || []).map((v: any) => ({
          id: v.id, version_name: v.name, version_number: v.version, branch_name: 'main',
        }))
        const cv: CLVersion[] = (c.versions || []).map((v: any) => ({ id: v.id, version_name: v.name }))
        const allDocs: AppDoc[] = d.documents || []
        setResumes(rv)
        setCoverLetters(cv)
        setDocs(allDocs)
        // Preselect most recent if not already set
        if (!props.initialResumeVersionId && rv.length) setResumeId(rv[0].id)
        if (!props.initialCoverLetterVersionId && cv.length) setCoverId(cv[0].id)
        // Auto-check every supporting document — user can uncheck anything
        // they don't want attached to this specific application.
        setDocIds(new Set(allDocs.map(doc => doc.id)))
      } catch (e) {
        showToast('error', 'Failed to load versions')
      }
    })()
  }, [props.open])

  if (!props.open) return null

  const toggleDoc = (id: number) => {
    setDocIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const run = async () => {
    if (!jobUrl.trim()) {
      showToast('error', 'Please enter the job URL')
      return
    }
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/agent/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: jobUrl.trim(),
          resumeVersionId: resumeId || null,
          coverLetterVersionId: coverId || null,
          documentIds: Array.from(docIds),
          jobDescription: props.initialJobDescription || null,
        }),
      })
      const data: AgentResult = await res.json()
      setResult(data)
      if (data.ok) {
        showToast('success', data.message || 'Browser open — verify and submit')
      } else {
        showToast('error', data.message || data.error || 'Agent did not finish')
      }
    } catch (e: any) {
      setResult({
        ok: false, jobUrl, attachments: [], steps: [],
        message: e?.message || 'Network error', error: e?.message,
      })
      showToast('error', e?.message || 'Network error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-ink/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-brand-border shadow-soft w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-brand-ink text-white flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div>
              <div className="font-semibold">Apply with browser agent</div>
              <div className="text-xs text-white/70 mt-0.5">Opens a visible browser, fills what it can, leaves the tab for you to verify and submit.</div>
            </div>
          </div>
          <button onClick={props.onClose} className="p-1 rounded hover:bg-brand-slate" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <label className="block">
            <span className="text-xs font-medium text-brand-slate">Job posting URL</span>
            <input
              type="url"
              value={jobUrl}
              onChange={e => setJobUrl(e.target.value)}
              placeholder="https://boards.greenhouse.io/acme/jobs/12345"
              className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Resume version</span>
              <select
                value={resumeId}
                onChange={e => setResumeId(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              >
                <option value="">— none —</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.version_number ? `${r.version_number} · ` : ''}{r.version_name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Cover letter version</span>
              <select
                value={coverId}
                onChange={e => setCoverId(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              >
                <option value="">— none —</option>
                {coverLetters.map(c => (
                  <option key={c.id} value={c.id}>{c.version_name}</option>
                ))}
              </select>
            </label>
          </div>

          {docs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-brand-slate mb-2">Additional documents to attach</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-brand-border p-2 bg-brand-mist/40">
                {docs.map(d => (
                  <label key={d.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={docIds.has(d.id)}
                      onChange={() => toggleDoc(d.id)}
                      className="w-4 h-4 rounded border-brand-border focus:ring-brand-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-brand-ink truncate">{d.name}</div>
                      <div className="text-xs text-brand-steel">{d.category}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl border p-4 ${
                result.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className={`flex items-center gap-2 text-sm font-semibold ${result.ok ? 'text-emerald-800' : 'text-red-800'}`}>
                {result.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {result.message}
              </div>
              {result.attachments.length > 0 && (
                <div className="mt-3 text-xs text-brand-slate">
                  <div className="font-semibold text-brand-ink mb-1">Attached</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.attachments.map((a, i) => (
                      <li key={i}><span className="font-mono">{a.role}</span> → {a.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.summary && (
                <div className="mt-3 text-xs text-brand-slate whitespace-pre-wrap leading-relaxed bg-brand-mist/40 border border-brand-border rounded-lg p-3">
                  {result.summary}
                </div>
              )}
              {result.finalUrl && result.finalUrl !== result.jobUrl && (
                <div className="mt-3 text-xs text-brand-steel">
                  Ended on <span className="font-mono break-all">{result.finalUrl}</span>
                </div>
              )}
              {result.uploadedFiles && result.uploadedFiles.length > 0 && (
                <div className="mt-3 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  <div className="font-semibold mb-1">Uploaded ({result.uploadedFiles.length})</div>
                  <ul className="list-disc pl-4 space-y-0.5 font-mono break-all">
                    {result.uploadedFiles.map((p, i) => (
                      <li key={i}>{p.split('/').pop()}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.steps && result.steps.length > 0 && (
                <details className="mt-3 rounded-lg border border-brand-border bg-white px-3 py-2">
                  <summary className="cursor-pointer text-xs text-brand-steel font-medium">
                    Agent step trace ({result.steps.length})
                  </summary>
                  <ol className="mt-2 space-y-0.5 text-[11px] font-mono text-brand-slate list-decimal pl-5">
                    {result.steps.slice(-30).map((s, i) => (
                      <li key={i} className="break-words">
                        <span className="text-brand-ink">{s.action || '(no action)'}</span>
                        {s.args ? <span className="text-brand-steel"> — {s.args}</span> : null}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {result.error && (
                <div className="mt-3 text-xs text-red-700 font-mono whitespace-pre-wrap">{result.error}</div>
              )}
            </div>
          )}

          {running && (
            <div className="rounded-xl border border-brand-border bg-brand-mist/40 p-4 flex items-center gap-3 text-sm text-brand-slate">
              <Spinner size="md" />
              <span>Launching browser, extracting form, and filling fields… this can take 30–60 seconds.</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-brand-border bg-brand-mist/40 flex items-center justify-between gap-3">
          <div className="text-xs text-brand-steel">
            A new Chromium window will open on your desktop. The agent will not submit — review and hit Submit yourself.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={props.onClose}>
              Close
            </Button>
            {result?.ok && (
              <a
                href={result.jobUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-slate hover:bg-brand-mist hover:border-brand-steel transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Job page
              </a>
            )}
            <Button onClick={run} loading={running} disabled={running || !jobUrl.trim()}>
              {result ? 'Run again' : 'Apply'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
