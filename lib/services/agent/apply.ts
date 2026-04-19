import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

import {
  renderResumeHtml,
} from '@/lib/templates/resume-html'
import { renderCoverLetterHtml } from '@/lib/templates/cover-letter-html'
import { htmlToPdf } from '@/lib/services/pdf-renderer'
import { getResumeVersion } from '@/lib/services/document-service'
import { getCoverLetterVersion } from '@/lib/services/document-service'
import { getDocumentsByIds, type AppDocument } from '@/lib/db/documents-store'
import { getProviderConfig } from '@/lib/llm/config'

/**
 * Model-name hints for reasoning models. browser-use's schema-heavy
 * function-calling workload stalls on these — they emit long thinking
 * traces and the provider returns empty errors mid-session. For Apply
 * specifically, the user should pick a non-reasoning model.
 */
const REASONING_HINTS = [
  'magistral',
  'o1',
  'o3',
  'o4-mini',
  'deepseek-reasoner',
  'deepseek-r1',
  'qwq',
  'thinking',
]

function isReasoningModel(model: string): boolean {
  const m = (model || '').toLowerCase()
  return REASONING_HINTS.some(h => m.includes(h))
}

/**
 * Apply Agent — delegates the actual browser work to `browser-use` (Python),
 * connected to the same LLM slot the app is using. The browser stays visible
 * so the user watches every action; the agent never clicks Submit.
 */

const TMP_PREFIX = path.join(os.tmpdir(), 'headhunter-apply-')
const APPLY_SCRIPT = path.join(process.cwd(), 'scripts', 'apply-agent.py')
const VENV_PYTHON = path.join(process.cwd(), 'scripts', '.venv', 'bin', 'python')

function pickPython(): string | null {
  // Highest priority: a dedicated venv at scripts/.venv carrying browser-use.
  // That's what `make apply-setup` (or the documented install commands) builds,
  // and it avoids PEP 668 issues with system Python on modern macOS/Linux.
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON

  const candidates = [
    process.env.PYTHON_BIN,
    'python3.13',
    'python3.12',
    'python3.11',
    'python3',
  ].filter(Boolean) as string[]
  for (const bin of candidates) {
    try {
      const { execSync } = require('child_process') as typeof import('child_process')
      const out = execSync(`${bin} -c "import sys;print(sys.version_info[:2])"`, {
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      })
        .toString()
        .trim()
      const m = out.match(/\((\d+), (\d+)\)/)
      if (!m) continue
      const major = Number(m[1])
      const minor = Number(m[2])
      if (major > 3 || (major === 3 && minor >= 11)) return bin
    } catch {
      continue
    }
  }
  return null
}

export interface ApplyInput {
  userId: number
  jobUrl: string
  resumeVersionId?: number | null
  coverLetterVersionId?: number | null
  documentIds?: number[]
  jobDescription?: string | null
}

export interface ApplyResult {
  ok: boolean
  jobUrl: string
  finalUrl?: string
  attachments: Array<{ role: string; name: string }>
  /** Paths the agent actually passed to the upload action. */
  uploadedFiles?: string[]
  /** Action-level trace surfaced to the UI. */
  steps: Array<{ action?: string; args?: string }>
  summary?: string
  /** Last ~1.5 KB of browser-use stderr — helps diagnose early exits. */
  stderrTail?: string
  error?: string
  message: string
}

interface PreparedFiles {
  resumePath?: string
  resumeName?: string
  resumeText?: string
  coverPath?: string
  coverName?: string
  coverText?: string
  extraDocs: Array<{ id: number; path: string; name: string; category: string }>
  personalInfo: Record<string, string>
  cleanup: () => void
}

function safeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60) || 'document'
}

async function prepareFiles(input: ApplyInput): Promise<PreparedFiles> {
  const workdir = fs.mkdtempSync(TMP_PREFIX)
  const personalInfo: Record<string, string> = {}
  const extraDocs: PreparedFiles['extraDocs'] = []
  let resumePath: string | undefined
  let resumeName: string | undefined
  let resumeText: string | undefined
  let coverPath: string | undefined
  let coverName: string | undefined
  let coverText: string | undefined

  if (input.resumeVersionId) {
    const version = getResumeVersion(input.userId, input.resumeVersionId)
    if (version) {
      const data = JSON.parse(version.data_json)
      const html = renderResumeHtml(data)
      const pdf = await htmlToPdf(html)
      resumeName = `${safeFilename(version.version_name || 'resume')}.pdf`
      resumePath = path.join(workdir, resumeName)
      fs.writeFileSync(resumePath, pdf)
      resumeText = flattenResume(data)
      if (data?.personalInfo) {
        for (const [k, v] of Object.entries(data.personalInfo)) {
          if (typeof v === 'string' && v.trim()) personalInfo[k] = v
        }
      }
    }
  }

  if (input.coverLetterVersionId) {
    const version = getCoverLetterVersion(input.userId, input.coverLetterVersionId)
    if (version) {
      const data = JSON.parse(version.data_json)
      const html = renderCoverLetterHtml({
        personalInfo: data.personalInfo,
        recipient: data.recipientInfo,
        content: {
          opening: data.openingParagraph,
          bodyParagraphs: data.bodyParagraphs,
          closing: data.closingParagraph,
        },
      })
      const pdf = await htmlToPdf(html)
      coverName = `${safeFilename(version.version_name || 'cover-letter')}.pdf`
      coverPath = path.join(workdir, coverName)
      fs.writeFileSync(coverPath, pdf)
      coverText = [data.openingParagraph, ...(data.bodyParagraphs || []), data.closingParagraph]
        .filter((s: any) => s && String(s).trim())
        .join('\n\n')
      if (data?.personalInfo) {
        for (const [k, v] of Object.entries(data.personalInfo)) {
          if (typeof v === 'string' && v.trim() && !personalInfo[k]) personalInfo[k] = v
        }
      }
    }
  }

  if (input.documentIds?.length) {
    const docs: AppDocument[] = getDocumentsByIds(input.userId, input.documentIds)
    for (const doc of docs) {
      if (!fs.existsSync(doc.file_path)) continue
      const destName = safeFilename(doc.name)
      const dest = path.join(workdir, destName)
      fs.copyFileSync(doc.file_path, dest)
      extraDocs.push({ id: doc.id, path: dest, name: doc.name, category: doc.category })
    }
  }

  return {
    resumePath,
    resumeName,
    resumeText,
    coverPath,
    coverName,
    coverText,
    extraDocs,
    personalInfo,
    cleanup: () => {
      try { fs.rmSync(workdir, { recursive: true, force: true }) } catch {}
    },
  }
}

function flattenResume(resume: any): string {
  if (!resume || typeof resume !== 'object') return ''
  const parts: string[] = []
  const p = resume.personalInfo || {}
  parts.push([p.firstName, p.lastName].filter(Boolean).join(' '))
  parts.push([p.email, p.phone, p.linkedin, p.github, p.address].filter(Boolean).join(' · '))
  if (resume.summary) parts.push(resume.summary)
  if (Array.isArray(resume.experiences)) {
    for (const e of resume.experiences) {
      parts.push(`${e.title} — ${e.company} (${e.dates})`)
      if (Array.isArray(e.bullets)) for (const b of e.bullets) parts.push(`• ${b}`)
    }
  }
  if (Array.isArray(resume.education)) {
    for (const e of resume.education) parts.push(`${e.degree} — ${e.institution} (${e.dates})`)
  }
  return parts.filter(Boolean).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Subprocess runner — spawns Python, pipes JSON in, parses JSON out.
// ─────────────────────────────────────────────────────────────────────────

async function runPythonAgent(payload: unknown, pythonBin: string): Promise<any> {
  return await new Promise<any>((resolve, reject) => {
    const child = spawn(pythonBin, [APPLY_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    child.stdout.on('data', (b: Buffer) => stdoutChunks.push(b))
    child.stderr.on('data', (b: Buffer) => stderrChunks.push(b))
    child.on('error', reject)
    child.on('close', code => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim()
      const stderr = Buffer.concat(stderrChunks).toString('utf8')
      const lastLine = stdout.split('\n').filter(Boolean).pop() || ''
      try {
        const parsed = JSON.parse(lastLine)
        // Attach a stderr tail so short / empty-trace runs can be debugged
        // in the UI without re-running.
        const tail = stderr.slice(-1500)
        if (tail) parsed.stderr_tail = tail
        resolve(parsed)
      } catch {
        resolve({
          ok: false,
          error: `browser-use exited with code ${code}. stderr (last 800 chars): ${stderr.slice(-800) || '(empty)'}`,
          message: 'Apply agent failed — is browser-use installed?',
          stderr_tail: stderr.slice(-1500),
        })
      }
    })
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────

export async function runApplyAgent(input: ApplyInput): Promise<ApplyResult> {
  const prepared = await prepareFiles(input)

  // Keep files alive for 30 min so the visible browser can still upload them
  // long after this HTTP response returns.
  const scheduleCleanup = () => setTimeout(prepared.cleanup, 30 * 60 * 1000)

  const pythonBin = pickPython()
  if (!pythonBin) {
    scheduleCleanup()
    return {
      ok: false,
      jobUrl: input.jobUrl,
      attachments: buildAttachments(prepared),
      steps: [],
      error:
        'Python 3.11+ is required for the Apply Agent. Install Python, then run: python3 -m pip install -r scripts/requirements.txt && python3 -m playwright install chromium',
      message: 'Apply Agent needs Python 3.11+ and browser-use. See Settings for install instructions.',
    }
  }

  let llmCfg
  try {
    llmCfg = getProviderConfig('agent')
  } catch (err: any) {
    scheduleCleanup()
    return {
      ok: false,
      jobUrl: input.jobUrl,
      attachments: buildAttachments(prepared),
      steps: [],
      error: err?.message || 'Agent model is not configured',
      message: 'Configure the agent model in Settings before running Apply.',
    }
  }

  // Hard-stop on reasoning models. browser-use's function-calling workload
  // is unreliable on them — they stall with empty provider errors. Better
  // to fail fast with a clear message than to waste 2-5 minutes on a run
  // that will give up.
  if (isReasoningModel(llmCfg.model)) {
    scheduleCleanup()
    return {
      ok: false,
      jobUrl: input.jobUrl,
      attachments: buildAttachments(prepared),
      steps: [],
      error: `The configured agent model "${llmCfg.model}" is a reasoning model. browser-use's browser-automation workload stalls on these (Magistral, o1/o3, DeepSeek-R1).`,
      message:
        'Switch the agent model to a non-reasoning variant for the Apply Agent to work reliably. Good picks: mistral-large-latest (Mistral), claude-sonnet-4-6 (Anthropic), gpt-5 (OpenAI). You can keep Magistral for everything else — Apply is the only feature that needs this.',
    }
  }

  const payload = {
    jobUrl: input.jobUrl,
    jobDescription: input.jobDescription || '',
    profile: prepared.personalInfo,
    resumeText: prepared.resumeText || '',
    coverLetterText: prepared.coverText || '',
    resumePath: prepared.resumePath || null,
    coverLetterPath: prepared.coverPath || null,
    extraDocs: prepared.extraDocs.map(d => ({
      path: d.path,
      name: d.name,
      category: d.category,
    })),
    llm: {
      kind: llmCfg.kind,
      baseUrl: llmCfg.baseUrl,
      apiKey: llmCfg.apiKey,
      model: llmCfg.model,
    },
  }

  try {
    const result = await runPythonAgent(payload, pythonBin)
    scheduleCleanup()
    return {
      ok: !!result.ok,
      jobUrl: input.jobUrl,
      finalUrl: result.finalUrl,
      attachments: buildAttachments(prepared),
      uploadedFiles: Array.isArray(result.uploaded_files) ? result.uploaded_files : [],
      steps: Array.isArray(result.steps) ? result.steps : [],
      summary: result.summary,
      error: result.error || undefined,
      stderrTail: typeof result.stderr_tail === 'string' ? result.stderr_tail : undefined,
      message:
        result.message ||
        (result.ok
          ? 'Browser is open. Review what the agent filled and submit when you are ready.'
          : 'Apply agent failed to complete.'),
    }
  } catch (err: any) {
    scheduleCleanup()
    return {
      ok: false,
      jobUrl: input.jobUrl,
      attachments: buildAttachments(prepared),
      steps: [],
      error: err?.message || String(err),
      message: 'Apply agent crashed before finishing.',
    }
  }
}

function buildAttachments(prepared: PreparedFiles): ApplyResult['attachments'] {
  const out: ApplyResult['attachments'] = []
  if (prepared.resumeName) out.push({ role: 'resume', name: prepared.resumeName })
  if (prepared.coverName) out.push({ role: 'cover_letter', name: prepared.coverName })
  for (const d of prepared.extraDocs) out.push({ role: d.category, name: d.name })
  return out
}
