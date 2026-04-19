import { NextResponse } from 'next/server'
import {
  addMemory,
  countByWing,
  listMemoryItems,
  searchMemory,
  factsByPredicate,
  factsAbout,
} from '@/lib/services/memory'

export const runtime = 'nodejs'

/**
 * GET /api/memory
 *   ?q=<query>             — vector search (returns hits)
 *   ?list=1&wing=<w>&limit= — paginated list (returns items + total)
 *   ?facts=user            — list facts for a subject
 *   (none)                 — counts-by-wing summary
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  const list = url.searchParams.get('list')
  const facts = url.searchParams.get('facts')
  const wing = url.searchParams.get('wing') || undefined
  const limit = Number(url.searchParams.get('limit') || 50)
  const offset = Number(url.searchParams.get('offset') || 0)
  const search = url.searchParams.get('search') || undefined

  try {
    if (q) {
      const hits = await searchMemory({
        query: q,
        wings: wing ? [wing] : undefined,
        k: limit,
        currentOnly: true,
      })
      return NextResponse.json({ hits })
    }
    if (facts) {
      return NextResponse.json({ facts: factsAbout(facts) })
    }
    if (list) {
      return NextResponse.json(listMemoryItems({ wing, limit, offset, search }))
    }
    return NextResponse.json({
      counts: countByWing(),
      facts: factsAbout('user'),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

/** POST /api/memory — create a memory item. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.wing || !body.content) {
    return NextResponse.json({ error: 'wing and content are required' }, { status: 400 })
  }
  try {
    const item = await addMemory({
      wing: body.wing,
      room: body.room ?? null,
      drawer: body.drawer ?? null,
      content: body.content,
      metadata: body.metadata,
      outcomeScore: typeof body.outcomeScore === 'number' ? body.outcomeScore : undefined,
    })
    return NextResponse.json(item, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
