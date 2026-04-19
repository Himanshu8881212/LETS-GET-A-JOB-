import { getBrowser } from '@/lib/services/headless-browser'
import { addMemory, listMemoryItems } from '@/lib/services/memory'
import { readSetting } from '@/lib/db/settings'

/**
 * Web search for the agent.
 *
 * Backends, in order of preference:
 *   1. Tavily  (if webSearch.tavilyApiKey setting or TAVILY_API_KEY env — advanced params)
 *   2. Brave   (if webSearch.braveApiKey setting or BRAVE_SEARCH_API_KEY env)
 *   3. DuckDuckGo HTML via the headless browser (no key required)
 *
 * Job-flavored searches can pass `jobPortalsOnly: true` to auto-scope to the
 * user's configured portal list (see DEFAULT_JOB_PORTALS). Results are
 * deduplicated across sessions against `wing=links` memory.
 */

// ─────────────────────────────────────────────────────────────────────────
// Default job portals — covers global + remote + ATS aggregators + Europe.
// Curated April 2026. Users edit the list in Settings → Web Search.
// ─────────────────────────────────────────────────────────────────────────
export const DEFAULT_JOB_PORTALS: string[] = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'wellfound.com',
  'weworkremotely.com',
  'remoteok.com',
  'otta.com',
  'arbeitnow.com',
  'builtin.com',
  'ycombinator.com',
  'lever.co',
  'greenhouse.io',
]

function getConfiguredJobPortals(): string[] {
  try {
    const raw = readSetting('webSearch.jobPortals')
    if (!raw) return DEFAULT_JOB_PORTALS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_JOB_PORTALS
    const cleaned = parsed
      .filter((s: unknown) => typeof s === 'string')
      .map((s: string) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter((s: string) => !!s)
    return cleaned.length ? cleaned : DEFAULT_JOB_PORTALS
  } catch {
    return DEFAULT_JOB_PORTALS
  }
}

function resolveKey(dbKey: string, envKey: string): string | undefined {
  try {
    const v = readSetting(dbKey)
    if (v) return v
  } catch { /* noop */ }
  return process.env[envKey] || undefined
}

/**
 * True when a Tavily API key is configured (DB or env). Tavily unlocks
 * structured job-board search and high-quality JD extraction from URLs.
 * Exported so callers (Scout tool, JD parser) can surface a setup hint
 * to the user when it's missing.
 */
export function hasTavilyKey(): boolean {
  return !!resolveKey('webSearch.tavilyApiKey', 'TAVILY_API_KEY')
}

export const TAVILY_SETUP_HINT =
  'Tavily is not configured. For reliable job-board search and JD parsing from links, add a free Tavily API key in Settings → Web Search (https://tavily.com).'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string
  url: string
  snippet: string
  date?: string
  source?: string
  score?: number
}

export type TimeRange = 'day' | 'week' | 'month' | 'year'

export interface SearchOptions {
  query: string
  /** Single domain filter — kept for backwards compat. Prefer `sites`. */
  site?: string
  /** List of domains to include (Tavily include_domains). Overrides `site`. */
  sites?: string[]
  /** Tavily time_range (newer). day | week | month | year. */
  timeRange?: TimeRange
  /** Legacy freshness in days. Mapped to timeRange when Tavily is used. */
  maxAgeDays?: number
  /** Max results to return after dedup. */
  limit?: number
  /** When true, scope `sites` to the configured job portal list. */
  jobPortalsOnly?: boolean
  /** Country bias (Tavily `country`). E.g. "germany", "united states". */
  country?: string
  /** Tavily advanced knob. Default: advanced. */
  searchDepth?: 'basic' | 'advanced'
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.hash = ''
    for (const p of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid']) {
      u.searchParams.delete(p)
    }
    return u.toString().replace(/\/$/, '')
  } catch {
    return raw
  }
}

function daysToTimeRange(days?: number): TimeRange | undefined {
  if (days == null) return undefined
  if (days <= 1) return 'day'
  if (days <= 7) return 'week'
  if (days <= 31) return 'month'
  return 'year'
}

/** Resolve effective sites array from `sites`, `site`, and `jobPortalsOnly`. */
function effectiveSites(opts: SearchOptions): string[] | undefined {
  if (opts.jobPortalsOnly) {
    const portals = getConfiguredJobPortals()
    // If the caller explicitly narrowed further, intersect.
    const extra = opts.sites || (opts.site ? [opts.site] : [])
    if (extra.length) {
      const extraNorm = extra.map(s => s.toLowerCase())
      const intersect = portals.filter(p => extraNorm.some(e => e.includes(p) || p.includes(e)))
      return intersect.length ? intersect : portals
    }
    return portals
  }
  if (opts.sites?.length) return opts.sites
  if (opts.site) return [opts.site]
  return undefined
}

function buildDuckQuery(opts: SearchOptions, sites: string[] | undefined): string {
  const parts = [opts.query]
  if (sites?.length === 1) parts.push(`site:${sites[0]}`)
  // DuckDuckGo can't OR-site filter cleanly; with >1 site we leave it unbounded
  // and let post-filter handle it.
  return parts.join(' ')
}

// ─────────────────────────────────────────────────────────────────────────
// Backend: Tavily (with advanced params)
// ─────────────────────────────────────────────────────────────────────────

async function searchTavily(apiKey: string, opts: SearchOptions, sites: string[] | undefined): Promise<SearchResult[]> {
  const limit = Math.max(1, Math.min(20, opts.limit ? opts.limit * 2 : 12))
  const body: any = {
    api_key: apiKey,
    query: opts.query,
    search_depth: opts.searchDepth || 'advanced',
    max_results: limit,
    chunks_per_source: 2,
    include_answer: false,
    include_raw_content: false,
    include_images: false,
  }
  const tr = opts.timeRange || daysToTimeRange(opts.maxAgeDays)
  if (tr) body.time_range = tr
  if (sites?.length) body.include_domains = sites.slice(0, 50)
  if (opts.country) body.country = opts.country

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`tavily ${res.status}: ${txt.slice(0, 200)}`)
  }
  const json: any = await res.json()
  return (json.results || []).map((r: any) => ({
    title: r.title || r.url,
    url: r.url,
    snippet: r.content || '',
    date: r.published_date,
    source: 'tavily',
    score: typeof r.score === 'number' ? r.score : undefined,
  }))
}

// ─────────────────────────────────────────────────────────────────────────
// Backend: Brave
// ─────────────────────────────────────────────────────────────────────────

async function searchBrave(apiKey: string, opts: SearchOptions, sites: string[] | undefined): Promise<SearchResult[]> {
  const q = sites?.length === 1 ? `${opts.query} site:${sites[0]}` : opts.query
  const params = new URLSearchParams({
    q,
    count: String(Math.min(20, opts.limit ? opts.limit * 2 : 12)),
  })
  const tr = opts.timeRange || daysToTimeRange(opts.maxAgeDays)
  if (tr) {
    const f = tr === 'day' ? 'pd' : tr === 'week' ? 'pw' : tr === 'month' ? 'pm' : 'py'
    params.set('freshness', f)
  }

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`brave ${res.status}`)
  const json: any = await res.json()
  let results: SearchResult[] = (json.web?.results || []).map((r: any) => ({
    title: r.title || r.url,
    url: r.url,
    snippet: r.description || '',
    date: r.age || r.page_age,
    source: 'brave',
  }))
  // Brave doesn't support multi-domain filtering — post-filter.
  if (sites?.length && sites.length > 1) {
    const lc = sites.map(s => s.toLowerCase())
    results = results.filter(r => lc.some(d => r.url.toLowerCase().includes(d)))
  }
  return results
}

// ─────────────────────────────────────────────────────────────────────────
// Backend: DuckDuckGo HTML (no API key)
// ─────────────────────────────────────────────────────────────────────────

async function searchDuckDuckGo(opts: SearchOptions, sites: string[] | undefined): Promise<SearchResult[]> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
    )
    const q = buildDuckQuery(opts, sites)
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    const results = await page.evaluate(() => {
      const out: any[] = []
      for (const r of Array.from(document.querySelectorAll('.result'))) {
        const link = r.querySelector('a.result__a') as HTMLAnchorElement | null
        const snippet = r.querySelector('.result__snippet') as HTMLElement | null
        if (!link || !link.href) continue
        out.push({
          title: link.textContent?.trim() || link.href,
          url: link.href,
          snippet: snippet?.textContent?.trim() || '',
        })
      }
      return out.slice(0, 25)
    })
    let cleaned = results
      .map(r => ({ ...r, url: resolveDuckRedirect(r.url), source: 'duckduckgo' as const }))
      .filter(r => r.url && /^https?:\/\//.test(r.url))
    if (sites?.length && sites.length > 1) {
      const lc = sites.map(s => s.toLowerCase())
      cleaned = cleaned.filter(r => lc.some(d => r.url.toLowerCase().includes(d)))
    }
    return cleaned
  } finally {
    await page.close().catch(() => {})
  }
}

function resolveDuckRedirect(raw: string): string {
  try {
    const u = new URL(raw, 'https://html.duckduckgo.com')
    const target = u.searchParams.get('uddg')
    if (target) return decodeURIComponent(target)
    return raw
  } catch {
    return raw
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Public API — backend selection + dedup + persistence
// ─────────────────────────────────────────────────────────────────────────

async function rawSearch(opts: SearchOptions): Promise<SearchResult[]> {
  const sites = effectiveSites(opts)
  const tavily = resolveKey('webSearch.tavilyApiKey', 'TAVILY_API_KEY')
  const brave = resolveKey('webSearch.braveApiKey', 'BRAVE_SEARCH_API_KEY')
  try {
    if (tavily) return await searchTavily(tavily, opts, sites)
  } catch {
    /* fall through */
  }
  try {
    if (brave) return await searchBrave(brave, opts, sites)
  } catch {
    /* fall through */
  }
  return searchDuckDuckGo(opts, sites)
}

export async function webSearchWithDedup(opts: SearchOptions): Promise<{
  results: SearchResult[]
  skippedDuplicates: number
  backend: string
  sitesUsed?: string[]
  setupHint?: string
}> {
  const limit = Math.max(1, Math.min(20, opts.limit ?? 6))
  const sitesUsed = effectiveSites(opts)
  const raw = await rawSearch(opts)

  const seen = listMemoryItems({ wing: 'links', limit: 2000 })
  const seenSet = new Set(seen.items.map(i => normalizeUrl(i.content)))

  const fresh: SearchResult[] = []
  let skippedDuplicates = 0
  for (const r of raw) {
    const norm = normalizeUrl(r.url)
    if (!norm) continue
    if (seenSet.has(norm)) { skippedDuplicates++; continue }
    seenSet.add(norm)
    fresh.push({ ...r, url: norm })
    if (fresh.length >= limit) break
  }

  for (const r of fresh) {
    addMemory({
      wing: 'links',
      drawer: r.source || 'search',
      content: r.url,
      metadata: { title: r.title, query: opts.query, sites: sitesUsed, date: r.date },
    }).catch(() => {})
  }

  const backend = raw[0]?.source || 'none'
  // Surface a setup hint when Tavily isn't configured. Any job search or
  // structured-result need is noticeably weaker on the DDG/Brave fallbacks,
  // so we nudge the user once per call instead of failing silently.
  const setupHint = !hasTavilyKey() ? TAVILY_SETUP_HINT : undefined

  return {
    results: fresh,
    skippedDuplicates,
    backend,
    sitesUsed,
    setupHint,
  }
}
