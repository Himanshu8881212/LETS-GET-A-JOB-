import { NextResponse } from 'next/server'
import { readAllSettings, upsertSettings } from '@/lib/db/settings'

export const runtime = 'nodejs'

const FEATURES = [
  'default',
  'agent',
  'parseJd',
  'parseResume',
  'parseCoverLetter',
  'generateResume',
  'generateCoverLetter',
  'evaluateAts',
  'scoutChat',
] as const

const FIELDS = ['provider', 'model', 'apiKey', 'baseUrl', 'oauth'] as const

type FeatureKey = (typeof FEATURES)[number]
type Field = (typeof FIELDS)[number]

interface FeatureConfigOut {
  provider: string
  model: string
  apiKey: string   // masked ("sk-***xxxx") if set; empty string if not
  baseUrl: string
  hasApiKey: boolean
  oauth: string    // 'openai_codex' | 'google_antigravity' | '' — which OAuth provider powers this slot
}

function mask(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '***'
  return `${key.slice(0, 4)}${'*'.repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`
}

function readFeature(all: Record<string, string>, feature: FeatureKey): FeatureConfigOut {
  const prefix = `llm.${feature}.`
  const out: FeatureConfigOut = {
    provider: all[`${prefix}provider`] || '',
    model: all[`${prefix}model`] || '',
    apiKey: '',
    baseUrl: all[`${prefix}baseUrl`] || '',
    hasApiKey: !!all[`${prefix}apiKey`],
    oauth: all[`${prefix}oauth`] || '',
  }
  if (out.hasApiKey) out.apiKey = mask(all[`${prefix}apiKey`])
  return out
}

function readEmbeddings(all: Record<string, string>) {
  const apiKeyRaw = all['embeddings.apiKey'] || ''
  return {
    provider: all['embeddings.provider'] || 'ollama',
    baseUrl: all['embeddings.baseUrl'] || '',
    model: all['embeddings.model'] || '',
    apiKey: apiKeyRaw ? mask(apiKeyRaw) : '',
    hasApiKey: !!apiKeyRaw,
  }
}

const DEFAULT_JOB_PORTALS_SHADOW = [
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'wellfound.com',
  'weworkremotely.com', 'remoteok.com', 'otta.com', 'arbeitnow.com',
  'builtin.com', 'ycombinator.com', 'lever.co', 'greenhouse.io',
]

function readWebSearch(all: Record<string, string>) {
  const tavily = all['webSearch.tavilyApiKey'] || ''
  const brave = all['webSearch.braveApiKey'] || ''
  let portals = DEFAULT_JOB_PORTALS_SHADOW
  let isDefault = true
  try {
    const raw = all['webSearch.jobPortals']
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        portals = parsed.filter((s: unknown) => typeof s === 'string')
        isDefault = false
      }
    }
  } catch { /* noop */ }
  return {
    tavilyApiKey: tavily ? mask(tavily) : '',
    hasTavilyKey: !!tavily,
    braveApiKey: brave ? mask(brave) : '',
    hasBraveKey: !!brave,
    jobPortals: portals,
    jobPortalsIsDefault: isDefault,
    defaultJobPortals: DEFAULT_JOB_PORTALS_SHADOW,
  }
}

export async function GET() {
  try {
    const all = readAllSettings()
    const byFeature: Record<string, FeatureConfigOut> = {}
    for (const f of FEATURES) byFeature[f] = readFeature(all, f)
    return NextResponse.json({
      features: byFeature,
      embeddings: readEmbeddings(all),
      webSearch: readWebSearch(all),
      env: {
        LLM_PROVIDER: process.env.LLM_PROVIDER || '',
        LLM_MODEL: process.env.LLM_MODEL || '',
        LLM_BASE_URL: process.env.LLM_BASE_URL || '',
        hasEnvApiKey: !!process.env.LLM_API_KEY,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to read settings', detail: err?.message || String(err) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Accept shape: { features: { default: { provider, model, apiKey?, baseUrl }, eval: {...}, ... } }
  const updates: Record<string, string | null> = {}
  const features = body.features || {}

  for (const feature of Object.keys(features)) {
    if (!(FEATURES as readonly string[]).includes(feature)) continue
    const cfg = features[feature] || {}
    for (const field of FIELDS) {
      if (!(field in cfg)) continue
      const value = cfg[field]
      // Skip apiKey if it looks like the masked value (contains asterisks)
      if (field === 'apiKey' && typeof value === 'string' && value.includes('*')) continue
      updates[`llm.${feature}.${field}`] = typeof value === 'string' && value.length > 0 ? value : null
    }
  }

  // Embeddings block — same shape as a feature, different key namespace.
  const embeddings = body.embeddings || {}
  if (embeddings && typeof embeddings === 'object') {
    for (const field of FIELDS) {
      if (!(field in embeddings)) continue
      const value = embeddings[field]
      if (field === 'apiKey' && typeof value === 'string' && value.includes('*')) continue
      updates[`embeddings.${field}`] = typeof value === 'string' && value.length > 0 ? value : null
    }
  }

  // Web search — tavilyApiKey / braveApiKey / jobPortals.
  const webSearch = body.webSearch || {}
  if (webSearch && typeof webSearch === 'object') {
    for (const key of ['tavilyApiKey', 'braveApiKey'] as const) {
      if (!(key in webSearch)) continue
      const value = webSearch[key]
      if (typeof value === 'string' && value.includes('*')) continue
      updates[`webSearch.${key}`] = typeof value === 'string' && value.length > 0 ? value : null
    }
    if ('jobPortals' in webSearch) {
      const raw = webSearch.jobPortals
      if (raw === null || (Array.isArray(raw) && raw.length === 0)) {
        // Reset to defaults.
        updates['webSearch.jobPortals'] = null
      } else if (Array.isArray(raw)) {
        const cleaned = raw
          .filter((s: unknown) => typeof s === 'string')
          .map((s: string) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
          .filter((s: string) => !!s)
        if (cleaned.length) updates['webSearch.jobPortals'] = JSON.stringify(cleaned)
      }
    }
  }

  try {
    upsertSettings(updates)
    return NextResponse.json({ ok: true, updated: Object.keys(updates).length })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save settings', detail: err?.message || String(err) }, { status: 500 })
  }
}
