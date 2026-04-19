import { NextResponse } from 'next/server'
import { polishSection, type PolishKind } from '@/lib/services/ai/polish-section'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED_KINDS: PolishKind[] = [
  'resume_summary',
  'resume_experience_bullet',
  'resume_experience_bullets',
  'resume_project_description',
  'resume_project_bullets',
  'resume_education_description',
  'cover_letter_opening',
  'cover_letter_body',
  'cover_letter_closing',
]

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const kind = body.kind as PolishKind | undefined
  if (!kind || !ALLOWED_KINDS.includes(kind)) {
    return NextResponse.json({ error: `kind is required, one of: ${ALLOWED_KINDS.join(', ')}` }, { status: 400 })
  }
  const content = typeof body.content === 'string' ? body.content : JSON.stringify(body.content ?? '')
  if (!content.trim()) {
    return NextResponse.json({ error: 'content is empty — nothing to polish' }, { status: 400 })
  }

  try {
    const { polished } = await polishSection({
      kind,
      content,
      context: typeof body.context === 'object' ? body.context : undefined,
    })
    return NextResponse.json({ polished })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Polish failed', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
