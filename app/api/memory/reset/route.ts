import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * Wipe the entire memory palace. Destructive — no recovery.
 * Requires POST + body { confirm: "delete-everything" } to reduce accidental hits.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || body.confirm !== 'delete-everything') {
    return NextResponse.json(
      { error: 'Confirmation required. Send { "confirm": "delete-everything" }.' },
      { status: 400 }
    )
  }
  try {
    const db = getDatabase()
    const itemCount = (db.prepare('SELECT COUNT(*) AS c FROM memory_items').get() as { c: number }).c
    const factCount = (db.prepare('SELECT COUNT(*) AS c FROM memory_facts').get() as { c: number }).c
    db.exec('DELETE FROM memory_items; DELETE FROM memory_facts;')
    return NextResponse.json({ ok: true, deletedItems: itemCount, deletedFacts: factCount })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
