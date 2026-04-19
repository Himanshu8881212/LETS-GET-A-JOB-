import { NextResponse } from 'next/server'
import { renderResumeDocx } from '@/lib/templates/resume-docx'
import type { ResumeData } from '@/lib/validation/schemas'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ResumeData | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const buf = await renderResumeDocx(body)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'inline; filename="resume.docx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('generate-resume-docx failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate Word document', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
