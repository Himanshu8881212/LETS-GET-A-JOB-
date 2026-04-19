import { getDatabase } from '@/lib/db'
import { getEmbeddingsConfig } from '@/lib/llm/config'
import { bufferToEmbedding, cosine, embedText } from './embed'
import { rowToItem, type MemoryItem, type MemoryItemRow } from './store'

export interface SearchOptions {
  query: string
  wings?: string[]
  rooms?: string[]
  k?: number
  /** Only return items currently valid (valid_until NULL or in the future). */
  currentOnly?: boolean
  /** Mix similarity with outcome_score: finalScore = sim * (1 - α) + normOutcome * α. 0..1. */
  outcomeWeight?: number
}

export interface SearchHit extends MemoryItem {
  similarity: number
  score: number
}

/**
 * Vector search with optional wing/room filters. Retrieval is:
 *   1. pull all candidate rows matching the filters (indexed by wing/room)
 *   2. compute cosine similarity in-memory
 *   3. optionally blend in outcome_score
 *
 * At single-user scale this is fine — hundreds to a few thousand rows per
 * wing run in single-digit ms. Swap in sqlite-vec later if needed.
 */
export async function searchMemory(opts: SearchOptions): Promise<SearchHit[]> {
  const queryVec = await embedText(opts.query)
  if (!queryVec) return []

  // Only compare against items embedded by the SAME model. Cosine across
  // models is meaningless. If the user switched providers, old items stay
  // dormant until they're re-indexed (or overwritten).
  let currentModel: string | null = null
  try { currentModel = getEmbeddingsConfig().model } catch { /* noop */ }

  const db = getDatabase()
  const where: string[] = ['embedding IS NOT NULL']
  const params: any[] = []

  if (currentModel) {
    where.push('(embedding_model = ? OR embedding_model IS NULL)')
    params.push(currentModel)
  }

  if (opts.wings?.length) {
    where.push(`wing IN (${opts.wings.map(() => '?').join(',')})`)
    params.push(...opts.wings)
  }
  if (opts.rooms?.length) {
    where.push(`room IN (${opts.rooms.map(() => '?').join(',')})`)
    params.push(...opts.rooms)
  }
  if (opts.currentOnly) {
    where.push('(valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)')
  }

  const sql = `SELECT * FROM memory_items WHERE ${where.join(' AND ')}`
  const rows = db.prepare(sql).all(...params) as MemoryItemRow[]

  const alpha = clamp01(opts.outcomeWeight ?? 0)
  const scored: SearchHit[] = []
  for (const row of rows) {
    if (!row.embedding) continue
    const vec = bufferToEmbedding(row.embedding)
    if (vec.length !== queryVec.length) continue // different dim → incompatible
    const sim = cosine(queryVec, vec)
    const outcome = row.outcome_score == null ? 0 : clamp01(row.outcome_score / 10)
    const finalScore = alpha > 0 ? sim * (1 - alpha) + outcome * alpha : sim
    scored.push({ ...rowToItem(row), similarity: sim, score: finalScore })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, opts.k ?? 5)
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/** Lightweight structural lookup — no embeddings, useful for the 170-token boot. */
export function listRecent(wing: string, limit = 5): MemoryItem[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      'SELECT * FROM memory_items WHERE wing = ? AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT ?'
    )
    .all(wing, limit) as MemoryItemRow[]
  return rows.map(rowToItem)
}

export function countByWing(): Array<{ wing: string; count: number }> {
  const db = getDatabase()
  const rows = db
    .prepare(
      'SELECT wing, COUNT(*) as count FROM memory_items WHERE valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP GROUP BY wing ORDER BY count DESC'
    )
    .all() as Array<{ wing: string; count: number }>
  return rows
}
