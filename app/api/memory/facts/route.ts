import { NextResponse } from 'next/server'
import { assertFact, factsAbout, factsByPredicate } from '@/lib/services/memory'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const subject = url.searchParams.get('subject')
  const predicate = url.searchParams.get('predicate')
  if (subject) return NextResponse.json({ facts: factsAbout(subject) })
  if (predicate) return NextResponse.json({ facts: factsByPredicate(predicate) })
  return NextResponse.json({ facts: factsAbout('user') })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !body.subject || !body.predicate || !body.object) {
    return NextResponse.json({ error: 'subject, predicate, and object are required' }, { status: 400 })
  }
  // Manual UI writes are the top of the precedence ladder.
  const f = assertFact(body.subject, body.predicate, body.object, {
    confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
    source: body.source === 'chat' || body.source === 'profile' ? body.source : 'manual',
  })
  return NextResponse.json(f, { status: 201 })
}
