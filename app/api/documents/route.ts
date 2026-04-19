import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { listDocuments, insertDocument, type DocCategory } from '@/lib/db/documents-store'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED: DocCategory[] = [
  'transcript', 'certification', 'reference',
  'portfolio', 'work_sample', 'identity', 'other',
]

const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

export async function GET() {
  try {
    const userId = await getUserSession()
    const docs = listDocuments(userId).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      mime_type: d.mime_type,
      size: d.size,
      description: d.description,
      created_at: d.created_at,
    }))
    return NextResponse.json({ documents: docs })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to list documents', detail: err?.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserSession()
    const form = await request.formData()
    const file = form.get('file') as File | null
    const nameOverride = (form.get('name') as string | null)?.trim()
    const categoryRaw = ((form.get('category') as string | null) || 'other').trim()
    const description = (form.get('description') as string | null)?.trim() || null

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (!ALLOWED.includes(categoryRaw as DocCategory)) {
      return NextResponse.json({ error: `invalid category (allowed: ${ALLOWED.join(', ')})` }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 15 MB' }, { status: 413 })
    }

    const doc = insertDocument({
      userId,
      name: nameOverride || file.name,
      category: categoryRaw as DocCategory,
      mimeType: file.type || null,
      buffer,
      description,
    })
    return NextResponse.json(
      {
        id: doc.id,
        name: doc.name,
        category: doc.category,
        mime_type: doc.mime_type,
        size: doc.size,
        description: doc.description,
        created_at: doc.created_at,
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to upload document', detail: err?.message }, { status: 500 })
  }
}
