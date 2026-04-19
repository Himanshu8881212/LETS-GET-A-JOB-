import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { runApplyAgent } from '@/lib/services/agent/apply'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const jobUrl = (body.jobUrl as string | undefined)?.trim()
  if (!jobUrl) return NextResponse.json({ error: 'jobUrl is required' }, { status: 400 })
  if (!/^https?:\/\//i.test(jobUrl)) return NextResponse.json({ error: 'jobUrl must be http or https' }, { status: 400 })

  try {
    const userId = await getUserSession()
    const result = await runApplyAgent({
      userId,
      jobUrl,
      resumeVersionId: body.resumeVersionId ?? null,
      coverLetterVersionId: body.coverLetterVersionId ?? null,
      documentIds: Array.isArray(body.documentIds) ? body.documentIds.filter((n: any) => Number.isFinite(n)) : [],
      jobDescription: body.jobDescription ?? null,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (err: any) {
    console.error('apply agent failed:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || String(err), filled: [], skipped: [], attachments: [], jobUrl: body?.jobUrl || '', message: 'Agent crashed — see error.' },
      { status: 500 }
    )
  }
}
