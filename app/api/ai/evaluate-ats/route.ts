import { NextResponse } from 'next/server'
import { evaluateAts } from '@/lib/services/ai/ats-evaluator'

export const runtime = 'nodejs'
export const maxDuration = 360

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { resume_text, cover_letter_text, job_description } = body
  if (!resume_text || !job_description) {
    return NextResponse.json(
      { error: 'resume_text and job_description are required' },
      { status: 400 }
    )
  }

  try {
    const result = await evaluateAts({ resume_text, cover_letter_text, job_description })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('evaluate-ats failed:', err)
    return NextResponse.json(
      { error: 'Failed to evaluate', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
