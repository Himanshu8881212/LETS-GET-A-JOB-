import { NextResponse } from 'next/server'
import { generateCoverLetter } from '@/lib/services/ai/cover-letter-gen'
import { parseJobDescriptionFromUrl } from '@/lib/services/ai/jd-parser'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const profile_text: string | object | undefined = body.profile_text ?? body.resume_data
  const jd_url: string | undefined = body.jd_url
  let job_description: string | undefined = body.job_description

  if (!profile_text) {
    return NextResponse.json({ error: 'profile_text (or resume_data) is required' }, { status: 400 })
  }
  if (!job_description && !jd_url) {
    return NextResponse.json({ error: 'Provide either job_description or jd_url' }, { status: 400 })
  }

  try {
    if (!job_description && jd_url) {
      job_description = await parseJobDescriptionFromUrl(jd_url)
    }
    const coverLetter = await generateCoverLetter({
      profile_text,
      job_description: job_description!,
      cover_letter_text: body.cover_letter_text,
    })
    return NextResponse.json(coverLetter)
  } catch (err: any) {
    console.error('ai/generate-cover-letter failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate cover letter', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
