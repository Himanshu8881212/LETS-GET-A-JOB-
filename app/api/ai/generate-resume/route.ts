import { NextResponse } from 'next/server'
import { generateResume } from '@/lib/services/ai/resume-gen'
import { parseJobDescriptionFromUrl } from '@/lib/services/ai/jd-parser'

export const runtime = 'nodejs'
export const maxDuration = 360

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
    const resume = await generateResume({
      profile_text,
      job_description: job_description!,
      cover_letter_text: body.cover_letter_text,
      generation_mode: body.generation_mode,
    })
    return NextResponse.json(resume)
  } catch (err: any) {
    console.error('ai/generate-resume failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate resume', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
