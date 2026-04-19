import { getBrowser } from '@/lib/services/headless-browser'

/**
 * URL → plain text for the JD parser.
 *
 * Cascades through three increasingly capable fetchers. The first one that
 * returns substantial content wins. For hostile job boards (StepStone,
 * Workday, Cloudflare-protected sites), Jina Reader is the workhorse —
 * it fetches the page from its own infrastructure so the target site
 * sees Jina's IP rather than ours, bypassing most bot detection. Free,
 * no API key required for reasonable volumes.
 *
 * Order:
 *   1. Plain HTTP — fastest (~200 ms). Works on ~70% of postings.
 *   2. Jina Reader (https://r.jina.ai/<url>) — free proxy that bypasses
 *      bot detection. Works on ~95% of postings including StepStone.
 *   3. Headless Chromium — only for JS-rendered pages that Jina can't
 *      execute. Slowest path (~5–15 s).
 *
 * If all three fail, throw an error telling the user to paste text.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

const DESKTOP_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|section|article|h[1-6]|li|br|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function validateUrl(url: string): void {
  if (!/^https?:\/\//i.test(url)) throw new Error('URL must be http or https')
}

function looksEmpty(text: string): boolean {
  if (!text) return true
  const stripped = text.replace(/\s+/g, ' ').trim()
  if (stripped.length < 500) return true
  const lowered = stripped.toLowerCase()
  if (/^(loading|please wait|redirecting)\b/.test(lowered)) return true
  if (/enable javascript/.test(lowered) && stripped.length < 1200) return true
  // Common bot-detection / rate-limit markers
  if (/just a moment|checking your browser|cloudflare|captcha|access denied|forbidden/i.test(stripped)
      && stripped.length < 2000) return true
  return false
}

async function fetchViaHttp(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: DESKTOP_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP fetch failed: ${res.status} ${res.statusText}`)
    const html = await res.text()
    return htmlToText(html)
  } finally {
    clearTimeout(timer)
  }
}

async function fetchViaJinaReader(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // r.jina.ai takes the target URL appended directly (not URL-encoded —
    // their reader handles the path as-is). Returns clean markdown.
    // Optional API key for higher rate limits can be passed via
    // JINA_READER_API_KEY env — not required for modest volumes.
    const readerUrl = `https://r.jina.ai/${url}`
    const headers: Record<string, string> = {
      Accept: 'text/plain',
      // Tell Jina to include the original URL's content type hints
      'X-Return-Format': 'markdown',
    }
    const apiKey = process.env.JINA_READER_API_KEY
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    const res = await fetch(readerUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Jina Reader failed: ${res.status} ${res.statusText}`)
    }
    const text = await res.text()
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchViaBrowser(url: string, timeoutMs: number): Promise<string> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setUserAgent(UA)
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' })

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    })
    if (response && !response.ok() && response.status() !== 0) {
      throw new Error(`Browser fetch failed: ${response.status()} ${response.statusText()}`)
    }
    await page
      .waitForFunction(
        () => !!document.body && document.body.innerText.trim().length > 300,
        { timeout: 2_500 }
      )
      .catch(() => {})

    const text: string = await page.evaluate(() => {
      document.querySelectorAll('script, style, noscript, svg').forEach(n => n.remove())
      const body = document.body
      if (!body) return ''
      return (body.innerText || body.textContent || '').toString()
    })

    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } finally {
    await page.close().catch(() => {})
  }
}

interface AttemptFailure { name: string; error: string }

export async function fetchPageText(url: string, timeoutMs = 30_000): Promise<string> {
  validateUrl(url)
  const failures: AttemptFailure[] = []

  // 1) Plain HTTP — fast path
  try {
    const text = await fetchViaHttp(url, 12_000)
    if (!looksEmpty(text)) return text
    failures.push({ name: 'plain fetch', error: 'empty / bot-gated content' })
  } catch (err) {
    failures.push({ name: 'plain fetch', error: err instanceof Error ? err.message : String(err) })
  }

  // 2) Jina Reader — free bot-detection bypass
  try {
    const text = await fetchViaJinaReader(url, 25_000)
    if (!looksEmpty(text)) return text
    failures.push({ name: 'Jina Reader', error: 'empty content' })
  } catch (err) {
    failures.push({ name: 'Jina Reader', error: err instanceof Error ? err.message : String(err) })
  }

  // 3) Headless Chromium — JS-rendered pages
  try {
    return await fetchViaBrowser(url, timeoutMs)
  } catch (err) {
    failures.push({ name: 'headless browser', error: err instanceof Error ? err.message : String(err) })
  }

  const detail = failures.map(f => `${f.name}: ${f.error}`).join(' | ')
  throw new Error(
    `Could not fetch ${url}. Attempts — ${detail}. ` +
      `Paste the job description text directly if the site is blocking automated fetches.`
  )
}
