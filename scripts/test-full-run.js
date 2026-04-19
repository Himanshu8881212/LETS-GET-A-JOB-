#!/usr/bin/env node

/**
 * End-to-end smoke test for Headhunter.
 *
 * Walks through the full pipeline against a running dev server:
 *   1.  GET  /api/settings                     — confirm config loaded
 *   2.  POST /api/settings/test                — ping the provider
 *   3.  POST /api/ai/parse-jd                  — JD text → structured
 *   4.  POST /api/ai/generate-resume           — profile + JD → resume JSON
 *   5.  POST /api/generate-resume              — resume JSON → PDF
 *   6.  POST /api/ai/generate-cover-letter     — resume + JD → cover letter JSON
 *   7.  POST /api/generate-cover-letter        — cover letter JSON → PDF
 *   8.  POST /api/ai/evaluate-ats              — 12-pillar scoring
 *   9.  POST /api/chat                         — Scout ping
 *
 * Usage:
 *   node scripts/test-full-run.js [baseUrl]
 *   npm run test:run
 *
 * Requires the dev server to be up (`npm run dev`) and Settings configured
 * (or LLM_* env vars set).
 */

const fs = require('fs')
const path = require('path')

const BASE = process.argv[2] || process.env.APP_URL || 'http://localhost:3000'

const SAMPLE_JD = `Senior Backend Engineer at Acme Payments

We're looking for a Senior Backend Engineer to join the Platform team. You'll architect and scale the transaction processing systems handling millions of daily operations.

Requirements:
- 5+ years of backend engineering experience
- Strong Python or Go proficiency
- Hands-on experience with AWS, Kubernetes, and PostgreSQL
- Track record of building high-throughput APIs
- Experience with payment or fintech systems is a plus

Responsibilities:
- Design and implement resilient microservices
- Optimise database performance for high concurrency
- Lead technical decisions across the platform team
- Mentor mid-level engineers

Location: San Francisco, CA (Hybrid). Compensation: $180-220K base.`

const SAMPLE_PROFILE = {
  personalInfo: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '+1 (555) 010-0100',
    linkedin: 'linkedin.com/in/janedoe',
    github: 'github.com/janedoe',
    address: 'San Francisco, CA',
  },
  summary:
    'Senior engineer with 7 years building distributed systems. Led backend platform scaling at two fintech startups. Expert in Python, Go, PostgreSQL, and AWS.',
  experiences: [
    {
      title: 'Senior Backend Engineer',
      company: 'PayStream',
      location: 'San Francisco, CA',
      dates: 'March 2021 — Present',
      bullets: [
        'Architected event-driven payment processing pipeline handling 40K TPS with p99 < 100ms',
        'Led migration from monolith to microservices on AWS EKS, reducing deploy time by 75%',
        'Mentored 4 engineers and ran hiring loop for the platform team',
      ],
    },
    {
      title: 'Backend Engineer',
      company: 'Fintrack',
      location: 'Remote',
      dates: 'June 2017 — March 2021',
      bullets: [
        'Built internal ledger service serving 30 production APIs with 99.95% uptime',
        'Optimised Postgres query path, cutting p95 read latency from 180ms to 35ms',
      ],
    },
  ],
  skillCategories: [
    { id: '1', name: 'Languages', skills: 'Python, Go, TypeScript, SQL' },
    { id: '2', name: 'Infrastructure', skills: 'AWS, Kubernetes, Docker, Terraform' },
    { id: '3', name: 'Data', skills: 'PostgreSQL, Redis, Kafka, BigQuery' },
  ],
  education: [
    {
      degree: 'B.S. Computer Science',
      institution: 'UC Berkeley',
      location: 'Berkeley, CA',
      dates: '2013 — 2017',
      gpa: '3.8',
    },
  ],
}

const palette = { reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m' }
function c(color, s) { return `${palette[color]}${s}${palette.reset}` }

async function postJsonOnce(url, body, timeoutMs) {
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const elapsed = Date.now() - started
    const contentType = res.headers.get('content-type') || ''
    const isPdf = contentType.includes('application/pdf')
    if (isPdf) {
      const buf = Buffer.from(await res.arrayBuffer())
      return { ok: res.ok, status: res.status, elapsed, pdf: buf, json: null, contentType }
    }
    const text = await res.text()
    let json = null
    try { json = text ? JSON.parse(text) : null } catch { /* keep text */ }
    return { ok: res.ok, status: res.status, elapsed, pdf: null, json, text, contentType }
  } finally {
    clearTimeout(timer)
  }
}

function isRateLimited(res) {
  if (!res || res.ok) return false
  const detail = (res.json && (res.json.detail || '')) + ''
  return res.status === 429 || /\b429\b/.test(detail) || /rate[_\- ]?limit/i.test(detail)
}

async function postJson(url, body, timeoutMs = 240_000, { retries = 2, retryDelayMs = 20_000 } = {}) {
  let last
  for (let attempt = 0; attempt <= retries; attempt++) {
    last = await postJsonOnce(url, body, timeoutMs)
    if (!isRateLimited(last) || attempt === retries) return last
    console.log(`    ${c('yellow', `⏳ rate-limited, retrying in ${retryDelayMs / 1000}s (attempt ${attempt + 2}/${retries + 1})…`)}`)
    await new Promise(r => setTimeout(r, retryDelayMs))
  }
  return last
}

async function getJson(url, timeoutMs = 30_000) {
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const elapsed = Date.now() - started
    const json = await res.json()
    return { ok: res.ok, status: res.status, elapsed, json }
  } finally {
    clearTimeout(timer)
  }
}

const OUT_DIR = path.join(process.cwd(), '.test-output')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
let stepCount = 0
let failed = 0
const totals = { time: 0, inputTokens: 0, outputTokens: 0 }

function step(name) {
  stepCount++
  process.stdout.write(c('cyan', `\n[${stepCount}]`) + ` ${c('bold', name)}\n`)
}

function report(res, opts = {}) {
  const { expectJson, label } = opts
  totals.time += res.elapsed
  if (!res.ok) {
    failed++
    console.log(`    ${c('red', '✗')} HTTP ${res.status} in ${res.elapsed} ms`)
    if (res.json) console.log(`    ${c('dim', JSON.stringify(res.json).slice(0, 500))}`)
    else if (res.text) console.log(`    ${c('dim', res.text.slice(0, 500))}`)
    return false
  }
  console.log(`    ${c('green', '✓')} HTTP ${res.status} in ${res.elapsed} ms`)
  if (expectJson && !res.json) {
    failed++
    console.log(`    ${c('red', '✗')} expected JSON, got ${res.contentType}`)
    return false
  }
  if (label && res.json) {
    const preview = JSON.stringify(res.json).slice(0, 220)
    console.log(`    ${c('dim', preview)}${preview.length >= 220 ? '…' : ''}`)
  }
  return true
}

async function main() {
  console.log(c('bold', `\n── Headhunter full-pipeline smoke test ──`))
  console.log(`Base URL: ${c('cyan', BASE)}`)
  console.log(`Output:   ${c('cyan', OUT_DIR)}\n`)

  // 1. GET settings
  step('GET /api/settings')
  const settings = await getJson(`${BASE}/api/settings`)
  if (!report(settings, { expectJson: true })) return fail()
  const defaults = settings.json?.features?.default
  const hasKey = defaults?.hasApiKey || settings.json?.env?.hasEnvApiKey
  if (!hasKey) {
    console.log(`    ${c('yellow', '⚠')} No API key configured. Open Settings and save one, or set LLM_API_KEY.`)
    console.log(`    ${c('dim', '(continuing so you can see which routes fail cleanly…)')}`)
  } else {
    console.log(`    provider=${c('cyan', defaults?.provider || settings.json?.env?.LLM_PROVIDER)} model=${c('cyan', defaults?.model || settings.json?.env?.LLM_MODEL)}`)
  }

  // 2. Ping provider
  step('POST /api/settings/test')
  const ping = await postJson(`${BASE}/api/settings/test`, {
    feature: 'default',
    provider: defaults?.provider || settings.json?.env?.LLM_PROVIDER,
    model: defaults?.model || settings.json?.env?.LLM_MODEL,
    baseUrl: defaults?.baseUrl || settings.json?.env?.LLM_BASE_URL || undefined,
  }, 30_000)
  report(ping, { expectJson: true, label: 'ping' })
  if (!ping.json?.ok) console.log(`    ${c('yellow', '⚠')} Provider ping failed — downstream LLM calls will also fail.`)

  // 3. JD parse
  step('POST /api/ai/parse-jd  (text mode, avoids network)')
  const jd = await postJson(`${BASE}/api/ai/parse-jd`, { text: SAMPLE_JD })
  report(jd, { expectJson: true })
  const jdOutput = jd.json?.output || ''
  if (jdOutput) console.log(`    ${c('dim', jdOutput.slice(0, 160).replace(/\n/g, ' '))}…`)

  // 4. Generate resume
  step('POST /api/ai/generate-resume')
  const genResume = await postJson(`${BASE}/api/ai/generate-resume`, {
    profile_text: SAMPLE_PROFILE,
    job_description: jdOutput || SAMPLE_JD,
  })
  report(genResume, { expectJson: true })
  const resumeData = genResume.json
  if (resumeData?._metadata) {
    console.log(`    target=${c('cyan', resumeData._metadata.target_role || '?')} coverage=${c('cyan', resumeData._metadata.keyword_coverage || '?')} ats=${c('cyan', resumeData._metadata.ats_compatibility_score ?? '?')}`)
  }
  const resumePathData = path.join(OUT_DIR, 'generated-resume.json')
  fs.writeFileSync(resumePathData, JSON.stringify(resumeData, null, 2))
  console.log(`    ${c('dim', `saved → ${resumePathData}`)}`)

  // 5. Render PDF
  step('POST /api/generate-resume  (PDF render)')
  const resumePdf = await postJson(`${BASE}/api/generate-resume`, resumeData || {})
  report(resumePdf)
  if (resumePdf.pdf) {
    const p = path.join(OUT_DIR, 'generated-resume.pdf')
    fs.writeFileSync(p, resumePdf.pdf)
    console.log(`    ${c('dim', `saved → ${p} (${resumePdf.pdf.length} bytes)`)}`)
  }

  // 6. Generate cover letter
  step('POST /api/ai/generate-cover-letter')
  const genCover = await postJson(`${BASE}/api/ai/generate-cover-letter`, {
    profile_text: resumeData || SAMPLE_PROFILE,
    job_description: jdOutput || SAMPLE_JD,
  })
  report(genCover, { expectJson: true })
  const coverData = genCover.json
  const coverPathData = path.join(OUT_DIR, 'generated-cover-letter.json')
  fs.writeFileSync(coverPathData, JSON.stringify(coverData, null, 2))
  console.log(`    ${c('dim', `saved → ${coverPathData}`)}`)

  // 7. Render cover letter PDF
  step('POST /api/generate-cover-letter  (PDF render)')
  const coverForRender = coverData && coverData.openingParagraph
    ? {
        personalInfo: coverData.personalInfo,
        recipient: coverData.recipientInfo,
        content: {
          opening: coverData.openingParagraph,
          bodyParagraphs: coverData.bodyParagraphs,
          closing: coverData.closingParagraph,
        },
      }
    : coverData
  const coverPdf = await postJson(`${BASE}/api/generate-cover-letter`, coverForRender || {})
  report(coverPdf)
  if (coverPdf.pdf) {
    const p = path.join(OUT_DIR, 'generated-cover-letter.pdf')
    fs.writeFileSync(p, coverPdf.pdf)
    console.log(`    ${c('dim', `saved → ${p} (${coverPdf.pdf.length} bytes)`)}`)
  }

  // 8. Evaluate ATS
  step('POST /api/ai/evaluate-ats')
  const resumeFlatText = flattenResume(resumeData)
  const coverFlatText = flattenCoverLetter(coverData)
  const evalRes = await postJson(`${BASE}/api/ai/evaluate-ats`, {
    resume_text: resumeFlatText || JSON.stringify(resumeData),
    cover_letter_text: coverFlatText || JSON.stringify(coverData),
    job_description: jdOutput || SAMPLE_JD,
  })
  report(evalRes, { expectJson: true })
  const evalJson = evalRes.json
  if (evalJson?.overall) {
    const ov = evalJson.overall || {}
    const score = ov.match_estimate ?? ov.weighted_score ?? '?'
    console.log(`    match=${c('cyan', score)} grade=${c('cyan', ov.letter_grade ?? '?')} action=${c('cyan', ov.recommended_action ?? '?')} interview=${c('cyan', ov.interview_likelihood ?? '?')}`)
  }
  fs.writeFileSync(path.join(OUT_DIR, 'evaluation.json'), JSON.stringify(evalJson, null, 2))

  // 9. Scout chat
  step('POST /api/chat')
  const chat = await postJson(`${BASE}/api/chat`, {
    message: 'Give me 3 power verbs to replace "worked on" in a resume bullet.',
    sessionId: 'smoke-test',
    history: [],
  })
  report(chat, { expectJson: true, label: 'chat' })
  if (chat.json?.reply) console.log(`    ${c('dim', String(chat.json.reply).slice(0, 200))}`)

  console.log('\n' + c('bold', '── Summary ──'))
  console.log(`Steps:   ${stepCount}`)
  console.log(`Passed:  ${c('green', stepCount - failed)}`)
  console.log(`Failed:  ${failed > 0 ? c('red', failed) : failed}`)
  console.log(`Time:    ${totals.time} ms`)
  console.log(`Artifacts in ${c('cyan', OUT_DIR)}:`)
  for (const f of fs.readdirSync(OUT_DIR)) console.log(`  · ${f}`)
  if (failed > 0) process.exit(1)
}

function flattenResume(resume) {
  if (!resume || typeof resume !== 'object') return ''
  const parts = []
  const p = resume.personalInfo || {}
  parts.push([p.firstName, p.lastName].filter(Boolean).join(' '))
  parts.push([p.email, p.phone, p.linkedin, p.github, p.address].filter(Boolean).join(' · '))
  if (resume.summary) parts.push('\nSUMMARY\n' + resume.summary)
  if (Array.isArray(resume.skillCategories) && resume.skillCategories.length) {
    parts.push('\nSKILLS')
    for (const c of resume.skillCategories) parts.push(`${c.name}: ${c.skills}`)
  }
  if (Array.isArray(resume.experiences)) {
    parts.push('\nEXPERIENCE')
    for (const e of resume.experiences) {
      parts.push(`${e.title} — ${e.company} (${e.dates})`)
      if (Array.isArray(e.bullets)) for (const b of e.bullets) parts.push(`- ${b}`)
    }
  }
  if (Array.isArray(resume.education)) {
    parts.push('\nEDUCATION')
    for (const e of resume.education) parts.push(`${e.degree} — ${e.institution} (${e.dates})`)
  }
  return parts.filter(Boolean).join('\n')
}

function flattenCoverLetter(cl) {
  if (!cl || typeof cl !== 'object') return ''
  const parts = []
  if (cl.openingParagraph) parts.push(cl.openingParagraph)
  if (Array.isArray(cl.bodyParagraphs)) for (const b of cl.bodyParagraphs) parts.push(b)
  if (cl.closingParagraph) parts.push(cl.closingParagraph)
  return parts.join('\n\n')
}

function fail() {
  console.log('\n' + c('red', '── aborted — see errors above ──'))
  process.exit(1)
}

main().catch(err => {
  console.error(c('red', '\nFatal: ') + (err?.message || err))
  process.exit(1)
})
