import { NextResponse } from 'next/server'
import { parseCoverLetterPdf } from '@/lib/services/ai/document-parser'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.pdfBase64) {
    return NextResponse.json({ error: 'pdfBase64 is required' }, { status: 400 })
  }

  try {
    const result = await parseCoverLetterPdf({ pdfBase64: body.pdfBase64, fileName: body.fileName })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('ai/parse-cover-letter failed:', err)
    return NextResponse.json(
      { error: 'Failed to parse cover letter', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
