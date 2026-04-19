import { NextResponse } from 'next/server'
import { renderResumeHtml } from '@/lib/templates/resume-html'
import { htmlToPdf } from '@/lib/services/pdf-renderer'
import type { ResumeData } from '@/lib/validation/schemas'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ResumeData | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const html = renderResumeHtml(body)
    const pdf = await htmlToPdf(html)

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="resume.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('generate-resume failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate resume', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
