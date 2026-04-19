import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { deleteDocument } from '@/lib/db/documents-store'

export const runtime = 'nodejs'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserSession()
    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
    const ok = deleteDocument(userId, id)
    if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete', detail: err?.message }, { status: 500 })
  }
}
