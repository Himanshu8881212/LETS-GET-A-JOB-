import { getDatabase } from '@/lib/db'
import { embedText, embeddingToBuffer } from './embed'
import { getEmbeddingsConfig } from '@/lib/llm/config'

export interface MemoryItem {
  id: number
  wing: string
  room: string | null
  drawer: string | null
  content: string
  metadata: Record<string, unknown> | null
  outcomeScore: number | null
  validFrom: string
  validUntil: string | null
  createdAt: string
}

export interface MemoryItemRow {
  id: number
  wing: string
  room: string | null
  drawer: string | null
  content: string
  metadata_json: string | null
  embedding: Buffer | null
  embedding_model: string | null
  dimensions: number | null
  outcome_score: number | null
  valid_from: string
  valid_until: string | null
  created_at: string
}

export interface AddMemoryInput {
  wing: string
  room?: string | null
  drawer?: string | null
  content: string
  metadata?: Record<string, unknown>
  outcomeScore?: number
  /** When truthy, skip embedding — useful for high-volume writes we'll embed later. */
  skipEmbedding?: boolean
}

/**
 * Write a memory item verbatim. Embedding is best-effort — if the embeddings
 * provider isn't reachable, the row is written without a vector and can be
 * back-filled later.
 */
export async function addMemory(input: AddMemoryInput): Promise<MemoryItem> {
  const db = getDatabase()
  let embeddingBuffer: Buffer | null = null
  let embeddingModel: string | null = null
  let dimensions: number | null = null

  if (!input.skipEmbedding) {
    const vec = await embedText(input.content)
    if (vec) {
      embeddingBuffer = embeddingToBuffer(vec)
      dimensions = vec.length
      try {
        embeddingModel = getEmbeddingsConfig().model
      } catch {
        embeddingModel = null
      }
    }
  }

  const stmt = db.prepare(`
    INSERT INTO memory_items (wing, room, drawer, content, metadata_json, embedding, embedding_model, dimensions, outcome_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const info = stmt.run(
    input.wing,
    input.room ?? null,
    input.drawer ?? null,
    input.content,
    input.metadata ? JSON.stringify(input.metadata) : null,
    embeddingBuffer,
    embeddingModel,
    dimensions,
    input.outcomeScore ?? null
  )

  const row = db
    .prepare('SELECT * FROM memory_items WHERE id = ?')
    .get(info.lastInsertRowid) as MemoryItemRow

  return rowToItem(row)
}

/** Mark an item as no-longer-valid without deleting it (temporal preservation). */
export function invalidateMemory(id: number, at: Date = new Date()): void {
  const db = getDatabase()
  db.prepare('UPDATE memory_items SET valid_until = ? WHERE id = ?').run(at.toISOString(), id)
}

/** Update an item's outcome_score — used to boost winners after ATS evaluation. */
export function setOutcomeScore(id: number, score: number): void {
  const db = getDatabase()
  db.prepare('UPDATE memory_items SET outcome_score = ? WHERE id = ?').run(score, id)
}

export interface ListOptions {
  wing?: string
  limit?: number
  offset?: number
  /** Substring match on content (case-insensitive). */
  search?: string
  includeExpired?: boolean
}

export function listMemoryItems(opts: ListOptions = {}): { items: MemoryItem[]; total: number } {
  const db = getDatabase()
  const where: string[] = []
  const params: any[] = []
  if (opts.wing) {
    where.push('wing = ?')
    params.push(opts.wing)
  }
  if (!opts.includeExpired) {
    where.push('(valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)')
  }
  if (opts.search?.trim()) {
    where.push('LOWER(content) LIKE ?')
    params.push(`%${opts.search.trim().toLowerCase()}%`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = (db.prepare(`SELECT COUNT(*) as c FROM memory_items ${whereSql}`).get(...params) as { c: number }).c
  const limit = Math.max(1, Math.min(200, opts.limit ?? 50))
  const offset = Math.max(0, opts.offset ?? 0)
  const rows = db
    .prepare(`SELECT * FROM memory_items ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as MemoryItemRow[]
  return { items: rows.map(rowToItem), total }
}

export function getMemoryItem(id: number): MemoryItem | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM memory_items WHERE id = ?').get(id) as MemoryItemRow | undefined
  return row ? rowToItem(row) : null
}

export interface UpdateInput {
  wing?: string
  room?: string | null
  drawer?: string | null
  content?: string
  outcomeScore?: number | null
  metadata?: Record<string, unknown> | null
}

/**
 * Edit an item in place. If `content` changes, the embedding is recomputed
 * best-effort (so search stays honest about the edit).
 */
export async function updateMemoryItem(id: number, patch: UpdateInput): Promise<MemoryItem | null> {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM memory_items WHERE id = ?').get(id) as MemoryItemRow | undefined
  if (!existing) return null

  const fields: string[] = []
  const params: any[] = []

  if (patch.wing !== undefined) { fields.push('wing = ?'); params.push(patch.wing) }
  if (patch.room !== undefined) { fields.push('room = ?'); params.push(patch.room) }
  if (patch.drawer !== undefined) { fields.push('drawer = ?'); params.push(patch.drawer) }
  if (patch.outcomeScore !== undefined) { fields.push('outcome_score = ?'); params.push(patch.outcomeScore) }
  if (patch.metadata !== undefined) {
    fields.push('metadata_json = ?')
    params.push(patch.metadata === null ? null : JSON.stringify(patch.metadata))
  }

  if (patch.content !== undefined && patch.content !== existing.content) {
    fields.push('content = ?'); params.push(patch.content)
    // Re-embed. If it fails, clear the stale embedding so searches don't
    // return a mismatched vector.
    const vec = await embedText(patch.content)
    if (vec) {
      fields.push('embedding = ?'); params.push(embeddingToBuffer(vec))
      fields.push('dimensions = ?'); params.push(vec.length)
      try {
        fields.push('embedding_model = ?'); params.push(getEmbeddingsConfig().model)
      } catch {
        fields.push('embedding_model = ?'); params.push(null)
      }
    } else {
      fields.push('embedding = ?'); params.push(null)
      fields.push('dimensions = ?'); params.push(null)
    }
  }

  if (!fields.length) return rowToItem(existing)

  params.push(id)
  db.prepare(`UPDATE memory_items SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  const row = db.prepare('SELECT * FROM memory_items WHERE id = ?').get(id) as MemoryItemRow
  return rowToItem(row)
}

export function deleteMemoryItem(id: number): boolean {
  const db = getDatabase()
  const info = db.prepare('DELETE FROM memory_items WHERE id = ?').run(id)
  return info.changes > 0
}

export function rowToItem(row: MemoryItemRow): MemoryItem {
  return {
    id: row.id,
    wing: row.wing,
    room: row.room,
    drawer: row.drawer,
    content: row.content,
    metadata: row.metadata_json ? safeParse(row.metadata_json) : null,
    outcomeScore: row.outcome_score,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    createdAt: row.created_at,
  }
}

function safeParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s) } catch { return null }
}
