import { getBrowser } from './headless-browser'

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.emulateMediaType('print')
    await page.setContent(html, { waitUntil: 'load', timeout: 15_000 })
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0.5in', right: '0.6in', bottom: '0.5in', left: '0.6in' },
    })
    return Buffer.from(pdf)
  } finally {
    await page.close().catch(() => {})
  }
}

export { shutdownBrowser as shutdownPdfRenderer } from './headless-browser'
