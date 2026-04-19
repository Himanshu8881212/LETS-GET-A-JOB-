import { NextResponse } from 'next/server'
import { renderCoverLetterHtml, type CoverLetterInput } from '@/lib/templates/cover-letter-html'
import { htmlToPdf } from '@/lib/services/pdf-renderer'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CoverLetterInput | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const html = renderCoverLetterHtml(body)
    const pdf = await htmlToPdf(html)

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="cover-letter.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('generate-cover-letter failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate cover letter', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
