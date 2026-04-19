import { NextResponse } from 'next/server'
import { deleteFact, getFact, updateFact } from '@/lib/services/memory'

export const runtime = 'nodejs'

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const f = getFact(id)
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(f)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const updated = updateFact(id, { object: body.object, confidence: body.confidence })
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const ok = deleteFact(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
