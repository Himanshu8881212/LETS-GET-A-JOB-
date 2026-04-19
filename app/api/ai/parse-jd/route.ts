import { NextResponse } from 'next/server'
import { parseJobDescriptionFromText, parseJobDescriptionFromUrl } from '@/lib/services/ai/jd-parser'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const url: string | undefined = body.url || body.jobUrl
  const text: string | undefined = body.text || body.jobText

  if (!url && !text) {
    return NextResponse.json({ error: 'Provide either `url` or `text`' }, { status: 400 })
  }

  try {
    const output = url
      ? await parseJobDescriptionFromUrl(url)
      : await parseJobDescriptionFromText(text!)
    return NextResponse.json({ output })
  } catch (err: any) {
    console.error('parse-jd failed:', err)
    return NextResponse.json(
      { error: 'Failed to parse job description', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
