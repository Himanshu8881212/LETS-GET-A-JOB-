import { NextResponse } from 'next/server'
import { reindexMemory } from '@/lib/services/memory/reindex'

export const runtime = 'nodejs'
export const maxDuration = 600

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  try {
    const result = await reindexMemory({ force: !!body.force })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
