import { complete } from '@/lib/llm'
import { loadPrompt, type PromptId } from './prompt-loader'
import { safeUserContent } from './escape'
import { extractionLooksCoherent, looksLikeEnglish } from './validators'

export interface PdfInput {
  pdfBase64: string
  fileName?: string
}

async function extractPdfText(pdfBase64: string): Promise<string> {
  const PDFParser = (await import('pdf2json')).default
  const buffer = Buffer.from(pdfBase64, 'base64')

  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser(null, 1)
    parser.on('pdfParser_dataError', (err: any) => {
      const raw = err?.parserError?.message || String(err?.parserError || err)
      // Translate well-known pdf2json errors into actionable messages.
      if (/encrypted|password/i.test(raw)) {
        return reject(new Error(
          'PDF is password-protected. Decrypt it first (e.g. with Preview → Export as PDF) and re-upload.',
        ))
      }
      if (/unsupported|corrupt|broken/i.test(raw)) {
        return reject(new Error(
          'PDF is corrupted or uses an unsupported format. Try re-exporting from the source application.',
        ))
      }
      reject(new Error(raw))
    })
    parser.on('pdfParser_dataReady', () => {
      try {
        resolve(parser.getRawTextContent())
      } catch (e: any) {
        reject(new Error(e?.message || String(e)))
      }
    })
    parser.parseBuffer(buffer)
  })
}

async function cleanWithLlm(
  feature: 'parseResume' | 'parseCoverLetter',
  rawText: string,
): Promise<string> {
  const promptId: PromptId = feature === 'parseResume' ? 'resume_cleaner' : 'cover_letter_cleaner'
  const cfg = loadPrompt(promptId)
  const result = await complete(feature, {
    messages: [
      { role: 'system', content: cfg.system },
      {
        role: 'user',
        content: `Raw text extracted from the PDF (restore and clean per the rules; work exclusively from this content):\n\n${safeUserContent(rawText)}`,
      },
    ],
    temperature: cfg.model.temperature ?? 0.1,
    maxTokens: cfg.model.maxTokens ?? 6000,
    timeoutMs: 120_000,
  })
  return result.text.trim()
}

function preflight(raw: string): { ok: boolean; warnings: string[] } {
  const warnings: string[] = []
  if (!raw.trim()) return { ok: false, warnings: ['PDF has no extractable text (likely scanned without OCR)'] }
  if (!extractionLooksCoherent(raw)) {
    warnings.push('Extracted text looks incoherent — scan quality may be poor or the PDF may use an unusual font encoding.')
  }
  if (!looksLikeEnglish(raw)) {
    warnings.push('Extracted text does not look like English. Output may be partial.')
  }
  return { ok: true, warnings }
}

export async function parseResumePdf(input: PdfInput): Promise<{ output: string; warnings?: string[] }> {
  if (!input.pdfBase64) throw new Error('pdfBase64 is required')
  const raw = await extractPdfText(input.pdfBase64)
  const pre = preflight(raw)
  if (!pre.ok) throw new Error(pre.warnings[0])
  const cleaned = await cleanWithLlm('parseResume', raw)
  return pre.warnings.length ? { output: cleaned, warnings: pre.warnings } : { output: cleaned }
}

export async function parseCoverLetterPdf(input: PdfInput): Promise<{ output: string; warnings?: string[] }> {
  if (!input.pdfBase64) throw new Error('pdfBase64 is required')
  const raw = await extractPdfText(input.pdfBase64)
  const pre = preflight(raw)
  if (!pre.ok) throw new Error(pre.warnings[0])
  const cleaned = await cleanWithLlm('parseCoverLetter', raw)
  return pre.warnings.length ? { output: cleaned, warnings: pre.warnings } : { output: cleaned }
}
