import { complete } from '@/lib/llm'
import { RESUME_CLEANER_PROMPT, COVER_LETTER_CLEANER_PROMPT } from './prompts'

export interface PdfInput {
  pdfBase64: string
  fileName?: string
}

async function extractPdfText(pdfBase64: string): Promise<string> {
  const PDFParser = (await import('pdf2json')).default
  const buffer = Buffer.from(pdfBase64, 'base64')

  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser(null, 1)
    parser.on('pdfParser_dataError', (err: any) =>
      reject(new Error(err?.parserError?.message || String(err?.parserError || err)))
    )
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

async function cleanWithLlm(feature: 'parseResume' | 'parseCoverLetter', rawText: string): Promise<string> {
  const prompt = feature === 'parseResume' ? RESUME_CLEANER_PROMPT : COVER_LETTER_CLEANER_PROMPT
  const result = await complete(feature, {
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: `Raw text extracted from the PDF (restore and clean per the rules; work exclusively from this content):\n\n${rawText}`,
      },
    ],
    temperature: 0.1,
    maxTokens: 6000,
    timeoutMs: 120_000,
  })
  return result.text.trim()
}

export async function parseResumePdf(input: PdfInput): Promise<{ output: string }> {
  if (!input.pdfBase64) throw new Error('pdfBase64 is required')
  const raw = await extractPdfText(input.pdfBase64)
  if (!raw.trim()) throw new Error('PDF has no extractable text')
  const cleaned = await cleanWithLlm('parseResume', raw)
  return { output: cleaned }
}

export async function parseCoverLetterPdf(input: PdfInput): Promise<{ output: string }> {
  if (!input.pdfBase64) throw new Error('pdfBase64 is required')
  const raw = await extractPdfText(input.pdfBase64)
  if (!raw.trim()) throw new Error('PDF has no extractable text')
  const cleaned = await cleanWithLlm('parseCoverLetter', raw)
  return { output: cleaned }
}
