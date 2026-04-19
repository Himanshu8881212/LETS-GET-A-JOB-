import fs from 'fs'
import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { getDocument } from '@/lib/db/documents-store'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserSession()
    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
    const doc = getDocument(userId, id)
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (!fs.existsSync(doc.file_path)) return NextResponse.json({ error: 'file missing on disk' }, { status: 410 })
    const buf = fs.readFileSync(doc.file_path)
    const safe = doc.name.replace(/["\r\n]/g, '')
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safe}"`,
        'Content-Length': String(buf.length),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch file', detail: err?.message }, { status: 500 })
  }
}
