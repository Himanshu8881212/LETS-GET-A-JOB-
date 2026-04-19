import puppeteer, { Browser } from 'puppeteer'

/**
 * Shared singleton headless Chromium used by the PDF renderer and the URL
 * fetcher. Launched lazily, kept alive across requests. Call
 * shutdownBrowser() to close it (handled automatically on process exit
 * by default; left here for tests).
 */

let browserPromise: Promise<Browser> | null = null

export function getBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise
  browserPromise = puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
      // Force HTTP/1.1 — some job boards (StepStone, strict Cloudflare)
      // reject Puppeteer's HTTP/2 handshake with ERR_HTTP2_PROTOCOL_ERROR.
      // HTTP/1.1 is fine for our workloads (PDF render + URL scraping).
      '--disable-features=HttpsUpgrades,HttpsFirstBalancedMode',
      '--disable-http2',
    ],
  })
  browserPromise.catch(() => {
    browserPromise = null
  })
  return browserPromise
}

export async function shutdownBrowser() {
  if (!browserPromise) return
  try {
    const b = await browserPromise
    await b.close()
  } finally {
    browserPromise = null
  }
}
