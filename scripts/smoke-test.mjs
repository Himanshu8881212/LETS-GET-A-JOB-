#!/usr/bin/env node
/**
 * End-to-end smoke test for Headhunter.
 *
 * Hits every AI feature against the running dev server and reports a
 * green/red matrix with timings. Designed to be safe to run repeatedly
 * (nothing destructive, idempotent memory writes).
 *
 * Usage:
 *   npm run dev                       # start the server in one terminal
 *   node scripts/smoke-test.mjs       # in another
 *
 * Env:
 *   SMOKE_BASE_URL    default http://localhost:3000
 *   SMOKE_RUN_APPLY   set to 1 to include the Apply Agent test — opens a
 *                     real visible Chromium window for ~40s. Skipped by
 *                     default because it requires a display and steals focus.
 *   SMOKE_SKIP_PARSE  set to 1 to skip PDF parsing (saves a few LLM calls)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const BASE = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
// Apply Agent always runs in a visible browser window (by design — the user
// watches what the AI types). That makes it unfit for CI, so smoke skips it
// by default. Set SMOKE_RUN_APPLY=1 locally to include it — a Chromium
// window will pop up for ~40s while it fills the sample form.
const RUN_APPLY = process.env.SMOKE_RUN_APPLY === '1'
const SKIP_PARSE = process.env.SMOKE_SKIP_PARSE === '1'

// ─── Styling ───────────────────────────────────────────────────────────────
const C = {
  dim: s => `\x1b[2m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
}

function log(...args) { console.log(...args) }
function section(title) {
  log('')
  log(C.bold(C.cyan(`━━━ ${title} ${'━'.repeat(Math.max(0, 60 - title.length))}`)))
}
function ok(msg) { log(C.green(`  ✓`), msg) }
function fail(msg) { log(C.red(`  ✗`), msg) }
function note(msg) { log(C.dim(`    ${msg}`)) }

// ─── HTTP helpers ──────────────────────────────────────────────────────────
// Persist the session cookie across requests so all calls look like the same
// user. Without this, each fetch() gets a fresh session — resume versions
// saved in one call are invisible to the next.
let sessionCookie = ''

function captureSetCookie(res) {
  const sc = res.headers.get('set-cookie')
  if (!sc) return
  const m = sc.match(/app_session_id=([^;]+)/)
  if (m) sessionCookie = `app_session_id=${m[1]}`
}

function baseHeaders(extra = {}) {
  const h = { ...extra }
  if (sessionCookie) h.Cookie = sessionCookie
  return h
}

async function postJson(pathname, body, timeoutMs = 300_000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${pathname}`, {
      method: 'POST',
      headers: baseHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    captureSetCookie(res)
    const txt = await res.text()
    let json
    try { json = JSON.parse(txt) } catch { json = { _raw: txt.slice(0, 500) } }
    return { ok: res.ok, status: res.status, json }
  } finally {
    clearTimeout(t)
  }
}

async function getJson(pathname, timeoutMs = 30_000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${pathname}`, { headers: baseHeaders(), signal: ctrl.signal })
    captureSetCookie(res)
    const json = await res.json()
    return { ok: res.ok, status: res.status, json }
  } finally {
    clearTimeout(t)
  }
}

// ─── Step runner ───────────────────────────────────────────────────────────
const results = []

async function step(name, fn, { optional = false } = {}) {
  const started = Date.now()
  try {
    const detail = await fn()
    const ms = Date.now() - started
    ok(`${name} ${C.dim(`(${ms} ms)`)}`)
    if (detail) note(detail)
    results.push({ name, ok: true, ms, detail })
    return true
  } catch (e) {
    const ms = Date.now() - started
    fail(`${name} ${C.dim(`(${ms} ms)`)} — ${e.message || e}`)
    results.push({ name, ok: false, ms, optional, error: String(e?.message || e) })
    return false
  }
}

// ─── Shared fixtures ───────────────────────────────────────────────────────
const SAMPLE_PROFILE_PATH = path.join(ROOT, 'public/samples/sample-resume-data.json')
const SAMPLE_RESUME_PDF = path.join(ROOT, 'public/samples/resumes/sample-resume.pdf')
const SAMPLE_CL_PDF = path.join(ROOT, 'public/samples/cover-letters/sample-cover-letter.pdf')

const SAMPLE_JD = `Senior Backend Engineer — FinTech, Berlin (remote-friendly).

You'll own core payment processing services written in Python: ingestion, reconciliation, webhook delivery. We run on AWS with Postgres + Kafka and handle ~12B events/day. You'll design for durability, observe what you build, and pair with platform + compliance teams on SLOs and incident response.

Requirements
- 5+ years backend engineering in Python at high-scale fintech or adjacent
- Strong Postgres, Kafka, and AWS fundamentals
- Experience with event-driven architectures and idempotent pipelines
- Track record of reducing latency, cost, or on-call burden with hard numbers
- Comfortable leading incidents and writing postmortems

Nice to have: Stripe / Adyen / Plaid familiarity, Go, OpenTelemetry.`

function loadProfile() {
  if (!fs.existsSync(SAMPLE_PROFILE_PATH)) throw new Error(`missing ${SAMPLE_PROFILE_PATH}`)
  return JSON.parse(fs.readFileSync(SAMPLE_PROFILE_PATH, 'utf8'))
}

function loadPdfBase64(p) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`)
  return fs.readFileSync(p).toString('base64')
}

// ─── Steps ─────────────────────────────────────────────────────────────────
async function checkHealth() {
  const res = await fetch(`${BASE}/`)
  if (!res.ok) throw new Error(`server returned ${res.status}`)
  return `server up at ${BASE}`
}

async function checkSettings() {
  const { ok: rok, json } = await getJson('/api/settings')
  if (!rok) throw new Error('settings endpoint failed')
  const agent = json.features?.agent
  const def = json.features?.default
  const which = agent?.hasApiKey ? 'agent' : def?.hasApiKey ? 'default (legacy)' : null
  if (!which) throw new Error('no API key configured for agent or default slot')
  const slot = agent?.hasApiKey ? agent : def
  return `using ${which} slot · ${slot.provider} · ${slot.model}`
}

async function stepParseJdText() {
  const { ok: rok, json } = await postJson('/api/ai/parse-jd', { text: SAMPLE_JD })
  if (!rok) throw new Error(json.error || json.detail || `status ${json.status}`)
  const body = json.output || json.job_description
  if (!body || typeof body !== 'string' || body.length < 80) throw new Error('parsed JD too short / empty')
  return `${body.length} chars`
}

let parsedResumeText = null

async function stepParseResumePdf() {
  if (SKIP_PARSE) return 'skipped'
  const pdfBase64 = loadPdfBase64(SAMPLE_RESUME_PDF)
  const { ok: rok, json } = await postJson('/api/ai/parse-resume', { pdfBase64, fileName: 'sample-resume.pdf' }, 240_000)
  if (!rok) throw new Error(json.error || json.detail)
  const text = json.output || json.parsedResume || json.parsed || json.text
  if (!text || text.length < 100) throw new Error(`parsed text too short (${text?.length || 0})`)
  parsedResumeText = text
  return `${text.length} chars extracted`
}

let parsedCoverLetterText = null

async function stepParseCoverLetterPdf() {
  if (SKIP_PARSE) return 'skipped'
  const pdfBase64 = loadPdfBase64(SAMPLE_CL_PDF)
  const { ok: rok, json } = await postJson('/api/ai/parse-cover-letter', { pdfBase64, fileName: 'sample-cover-letter.pdf' }, 240_000)
  if (!rok) throw new Error(json.error || json.detail)
  const text = json.output || json.parsedCoverLetter || json.parsed || json.text
  if (!text || text.length < 100) throw new Error(`parsed text too short (${text?.length || 0})`)
  parsedCoverLetterText = text
  return `${text.length} chars extracted`
}

let generatedResume = null

async function stepGenerateResume() {
  const profile = loadProfile()
  const { ok: rok, json } = await postJson(
    '/api/ai/generate-resume',
    { profile_text: profile, job_description: SAMPLE_JD },
    360_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  if (!json.personalInfo || !json.experiences) throw new Error('missing required fields')
  generatedResume = json
  const expCount = Array.isArray(json.experiences) ? json.experiences.length : 0
  return `${expCount} experiences · ${(json.personalInfo?.firstName || '?')} ${(json.personalInfo?.lastName || '')}`
}

async function stepTailorResume() {
  const profile = loadProfile()
  const { ok: rok, json } = await postJson(
    '/api/ai/tailor-resume',
    { profile_text: profile, job_description: SAMPLE_JD, generation_mode: 'optimize' },
    360_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  if (!json.experiences) throw new Error('missing experiences')
  const bulletCount = json.experiences.reduce((n, e) => n + (e.bullets?.length || 0), 0)
  return `${json.experiences.length} experiences · ${bulletCount} bullets total`
}

let generatedCoverLetter = null

async function stepGenerateCoverLetter() {
  const profile = loadProfile()
  const { ok: rok, json } = await postJson(
    '/api/ai/generate-cover-letter',
    { profile_text: profile, job_description: SAMPLE_JD },
    300_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  if (!json.openingParagraph) throw new Error('missing openingParagraph')
  generatedCoverLetter = json
  const bodyCount = Array.isArray(json.bodyParagraphs) ? json.bodyParagraphs.length : 0
  return `opener + ${bodyCount} body paragraphs + closing`
}

async function stepTailorCoverLetter() {
  const profile = loadProfile()
  const { ok: rok, json } = await postJson(
    '/api/ai/tailor-cover-letter',
    { profile_text: profile, job_description: SAMPLE_JD },
    300_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  if (!json.openingParagraph) throw new Error('missing openingParagraph')
  return 'tailored cover letter returned'
}

async function stepEvaluateAts() {
  const profile = loadProfile()
  const resumeText = parsedResumeText || buildResumeTextFromProfile(profile)
  const clText = parsedCoverLetterText || buildCoverLetterTextFromGenerated(generatedCoverLetter)
  const { ok: rok, json } = await postJson(
    '/api/ai/evaluate-ats',
    { resume_text: resumeText, cover_letter_text: clText, job_description: SAMPLE_JD },
    360_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  const score = json.match_estimate ?? json.overall?.match_estimate ?? json.overall?.weighted_score
  if (typeof score !== 'number') throw new Error('no score returned — shape: ' + Object.keys(json).join(','))
  return `match_estimate = ${score}`
}

async function stepScoutBuffered() {
  const { ok: rok, json } = await postJson(
    '/api/chat',
    { message: 'In five words or fewer, say hello.' },
    120_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  if (!json.reply || !json.reply.trim()) throw new Error('empty reply')
  return `"${json.reply.trim().slice(0, 80)}"`
}

async function stepScoutStreaming() {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 120_000)
  try {
    const res = await fetch(`${BASE}/api/chat/stream`, {
      method: 'POST',
      headers: baseHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
      body: JSON.stringify({ message: 'Respond with exactly: STREAM_OK' }),
      signal: ctrl.signal,
    })
    captureSetCookie(res)
    if (!res.ok || !res.body) throw new Error(`status ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let chunks = 0
    let text = ''
    let gotDone = false
    let buf = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let dbl
      while ((dbl = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, dbl); buf = buf.slice(dbl + 2)
        const lines = raw.split('\n')
        let event = 'message', data = ''
        for (const ln of lines) {
          if (ln.startsWith('event:')) event = ln.slice(6).trim()
          else if (ln.startsWith('data:')) data += ln.slice(5).trim()
        }
        if (!data) continue
        try {
          const p = JSON.parse(data)
          if (event === 'text' && p.text) { chunks++; text += p.text }
          if (event === 'done') gotDone = true
          if (event === 'error') throw new Error(p.message)
        } catch (e) { if (e.message) throw e }
      }
    }
    if (!gotDone) throw new Error('no done event received')
    if (chunks < 1) throw new Error('no text chunks')
    return `${chunks} chunks · ${text.trim().length} chars`
  } finally {
    clearTimeout(t)
  }
}

async function stepMemoryCrud() {
  const created = await postJson('/api/memory', {
    wing: 'profile',
    drawer: 'smoke',
    content: 'SMOKE_TEST_MARKER — delete after test',
    outcomeScore: 5,
  })
  if (!created.ok) throw new Error(`create: ${created.json.error}`)
  const id = created.json.id
  if (!id) throw new Error('no id returned')

  const patched = await fetch(`${BASE}/api/memory/items/${id}`, {
    method: 'PATCH',
    headers: baseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ outcomeScore: 7.5 }),
  }).then(r => r.json())
  if (patched.outcomeScore !== 7.5) throw new Error('patch did not persist')

  const deleted = await fetch(`${BASE}/api/memory/items/${id}`, {
    method: 'DELETE',
    headers: baseHeaders(),
  })
  if (!deleted.ok) throw new Error('delete failed')

  return `item #${id} created → patched → deleted`
}

async function stepFactCrud() {
  const created = await postJson('/api/memory/facts', {
    subject: 'user',
    predicate: 'smoke_test_marker',
    object: 'present',
  })
  if (!created.ok) throw new Error('create failed')
  const id = created.json.id

  const r = await fetch(`${BASE}/api/memory/facts/${id}`, {
    method: 'DELETE',
    headers: baseHeaders(),
  })
  if (!r.ok) throw new Error('delete failed')
  return `fact created + deleted`
}

async function stepAgentToolLoop() {
  const { ok: rok, json } = await postJson(
    '/api/agent/run',
    { goal: 'Without using any tools, reply with exactly: AGENT_OK' },
    120_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  if (!json.reply) throw new Error('no reply')
  return `${json.iterations} iter · ${json.toolTrace?.length || 0} tool calls · "${json.reply.slice(0, 60)}"`
}

async function stepAgentWithTools() {
  const { ok: rok, json } = await postJson(
    '/api/agent/run',
    {
      goal: 'Store a durable fact: user.smoke_agent_marker = present. Then look up facts about "user" and report how many you found. Then assert the retraction fact and reply "DONE".',
    },
    180_000
  )
  if (!rok) throw new Error(json.error || json.detail)
  const calls = json.toolTrace?.length || 0
  if (calls < 1) throw new Error('agent did not call any tools')
  const names = new Set(json.toolTrace.map(t => t.name))
  // cleanup: retract the marker fact via DELETE if it persisted
  try {
    const summary = await getJson('/api/memory/facts?subject=user')
    const marker = summary.json?.facts?.find(f => f.predicate === 'smoke_agent_marker')
    if (marker) await fetch(`${BASE}/api/memory/facts/${marker.id}`, { method: 'DELETE', headers: baseHeaders() })
  } catch { /* noop */ }
  return `${calls} tool calls [${[...names].join(', ')}]`
}

async function stepTelemetry() {
  const { ok: rok, json } = await getJson('/api/telemetry/llm-calls?limit=5')
  if (!rok) throw new Error('telemetry endpoint down')
  const calls = json.summary?.totals?.calls ?? 0
  if (calls < 1) throw new Error('no calls logged')
  return `${calls} calls in last 24h · ${json.summary.totals.avg_ms} ms avg`
}

async function stepApplyAgent() {
  if (!RUN_APPLY) return 'skipped (set SMOKE_RUN_APPLY=1 to include — opens a real browser window and needs python + browser-use installed)'

  const profile = loadProfile()
  const created = await postJson(
    '/api/resumes',
    {
      version_name: 'smoke-test-resume',
      data: profile,
      branch_name: 'smoke',
    },
    30_000
  )
  if (!created.ok || !created.json?.id) throw new Error('could not create test resume version')
  const resumeVersionId = created.json.id

  try {
    const url = `${BASE}/_smoke/sample-form.html`
    note('a Chromium window is about to open — watch browser-use fill the form')
    const { ok: rok, json } = await postJson(
      '/api/agent/apply',
      {
        jobUrl: url,
        jobDescription: SAMPLE_JD,
        resumeVersionId,
      },
      600_000
    )
    if (!rok) throw new Error(json.error || json.detail || 'apply crashed')
    if (!json.ok) throw new Error(json.error || 'agent returned ok: false')
    const stepCount = Array.isArray(json.steps) ? json.steps.length : 0
    return `${stepCount} steps · ${json.attachments?.length || 0} attachments`
  } finally {
    await fetch(`${BASE}/api/resumes/${resumeVersionId}`, {
      method: 'DELETE',
      headers: baseHeaders(),
    }).catch(() => {})
  }
}

// ─── Fallbacks when we don't have parsed PDF text ─────────────────────────
function buildResumeTextFromProfile(p) {
  const lines = []
  const pi = p.personalInfo || {}
  lines.push(`${pi.firstName || ''} ${pi.lastName || ''}`.trim())
  lines.push([pi.email, pi.phone, pi.address].filter(Boolean).join(' · '))
  if (p.summary) lines.push('', p.summary)
  if (Array.isArray(p.skillCategories)) {
    lines.push('', 'SKILLS')
    for (const c of p.skillCategories) lines.push(`${c.name}: ${c.skills}`)
  }
  if (Array.isArray(p.experiences)) {
    lines.push('', 'EXPERIENCE')
    for (const e of p.experiences) {
      lines.push(`${e.title} — ${e.company} — ${e.dates}`)
      if (Array.isArray(e.bullets)) for (const b of e.bullets) lines.push(`• ${b}`)
    }
  }
  return lines.join('\n')
}

function buildCoverLetterTextFromGenerated(cl) {
  if (!cl) return '(no cover letter provided)'
  return [cl.openingParagraph, ...(cl.bodyParagraphs || []), cl.closingParagraph]
    .filter(Boolean)
    .join('\n\n')
}

// ─── Runner ────────────────────────────────────────────────────────────────
async function main() {
  log(C.bold(`\nHeadhunter smoke test — ${BASE}`))

  section('Prerequisites')
  if (!(await step('Dev server reachable', checkHealth))) {
    log(C.red(`\nServer not reachable at ${BASE}. Start with: npm run dev`))
    process.exit(1)
  }
  if (!(await step('Settings configured', checkSettings))) {
    log(C.red(`\nConfigure the agent model + key at ${BASE} → Settings.`))
    process.exit(1)
  }

  section('Parse')
  await step('Parse JD (raw text)', stepParseJdText)
  await step('Parse resume PDF', stepParseResumePdf, { optional: SKIP_PARSE })
  await step('Parse cover letter PDF', stepParseCoverLetterPdf, { optional: SKIP_PARSE })

  section('Generation')
  await step('Generate resume', stepGenerateResume)
  await step('Tailor resume', stepTailorResume)
  await step('Generate cover letter', stepGenerateCoverLetter)
  await step('Tailor cover letter', stepTailorCoverLetter)

  section('Evaluation')
  await step('ATS evaluator', stepEvaluateAts)

  section('Scout')
  await step('Scout buffered', stepScoutBuffered)
  await step('Scout streaming (SSE)', stepScoutStreaming)

  section('Memory')
  await step('Memory item CRUD', stepMemoryCrud)
  await step('Fact CRUD', stepFactCrud)

  section('Agents')
  await step('Tool-use agent (direct reply)', stepAgentToolLoop)
  await step('Tool-use agent (tool invocation)', stepAgentWithTools)
  await step('Apply agent (visible browser)', stepApplyAgent, { optional: !RUN_APPLY })

  section('Observability')
  await step('Telemetry captures calls', stepTelemetry)

  // ─── Summary ────────────────────────────────────────────────────────────
  log('')
  log(C.bold('Summary'))
  const passed = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok && !r.optional).length
  const skipped = results.filter(r => !r.ok && r.optional).length
  const totalMs = results.reduce((n, r) => n + r.ms, 0)
  log(`  ${C.green(passed + ' passed')}  ${failed ? C.red(failed + ' failed') : C.dim('0 failed')}  ${skipped ? C.yellow(skipped + ' skipped') : C.dim('0 skipped')}  ${C.dim(`· ${(totalMs / 1000).toFixed(1)}s total`)}`)

  if (failed > 0) {
    log('')
    log(C.red('Failed:'))
    for (const r of results.filter(r => !r.ok && !r.optional)) log(`  • ${r.name} — ${r.error}`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
