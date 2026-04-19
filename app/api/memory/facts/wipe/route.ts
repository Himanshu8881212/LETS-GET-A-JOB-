import { NextResponse } from 'next/server'
import { deleteFactsBySource, type FactSource } from '@/lib/services/memory/facts'

export const runtime = 'nodejs'

/**
 * Bulk delete facts by source + optional subject. Useful when sample data
 * has polluted the store during testing.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const source = body.source as FactSource
  if (!['manual', 'chat', 'profile', 'inferred', 'unknown'].includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }
  const subject = typeof body.subject === 'string' ? body.subject : undefined
  const deleted = deleteFactsBySource(source, subject)
  return NextResponse.json({ deleted })
}
