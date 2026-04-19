import fs from 'fs'
import path from 'path'
import { getDatabase } from './index'

const STORAGE_DIR = path.join(process.cwd(), 'data', 'documents')
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true })

export type DocCategory =
  | 'resume'
  | 'cover_letter'
  | 'transcript'
  | 'certification'
  | 'reference'
  | 'portfolio'
  | 'work_sample'
  | 'identity'
  | 'other'

export interface AppDocument {
  id: number
  user_id: number
  name: string
  category: DocCategory
  file_path: string
  mime_type: string | null
  size: number | null
  description: string | null
  created_at: string
}

export function listDocuments(userId: number): AppDocument[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM application_documents WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as AppDocument[]
}

export function getDocument(userId: number, id: number): AppDocument | undefined {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM application_documents WHERE id = ? AND user_id = ?')
    .get(id, userId) as AppDocument | undefined
}

export function getDocumentsByIds(userId: number, ids: number[]): AppDocument[] {
  if (!ids.length) return []
  const db = getDatabase()
  const placeholders = ids.map(() => '?').join(',')
  return db
    .prepare(`SELECT * FROM application_documents WHERE user_id = ? AND id IN (${placeholders}) ORDER BY created_at DESC`)
    .all(userId, ...ids) as AppDocument[]
}

export interface InsertDocumentInput {
  userId: number
  name: string
  category: DocCategory
  mimeType: string | null
  buffer: Buffer
  description?: string | null
}

export function insertDocument(input: InsertDocumentInput): AppDocument {
  const db = getDatabase()
  const safe = input.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'document'
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
  const filepath = path.join(STORAGE_DIR, filename)
  fs.writeFileSync(filepath, input.buffer)
  const size = input.buffer.length

  const result = db
    .prepare(
      `INSERT INTO application_documents (user_id, name, category, file_path, mime_type, size, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.userId,
      input.name,
      input.category,
      filepath,
      input.mimeType || null,
      size,
      input.description || null
    )

  return getDocument(input.userId, Number(result.lastInsertRowid))!
}

export function deleteDocument(userId: number, id: number): boolean {
  const db = getDatabase()
  const doc = getDocument(userId, id)
  if (!doc) return false
  try {
    if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path)
  } catch {}
  const result = db.prepare('DELETE FROM application_documents WHERE id = ? AND user_id = ?').run(id, userId)
  return result.changes > 0
}
