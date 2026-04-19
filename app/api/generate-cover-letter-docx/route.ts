import { NextResponse } from 'next/server'
import { renderCoverLetterDocx, type CoverLetterInput } from '@/lib/templates/cover-letter-docx'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CoverLetterInput | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const buf = await renderCoverLetterDocx(body)
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'inline; filename="cover-letter.docx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('generate-cover-letter-docx failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate Word document', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
