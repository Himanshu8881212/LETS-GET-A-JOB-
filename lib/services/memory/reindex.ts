import { getDatabase } from '@/lib/db'
import { getEmbeddingsConfig } from '@/lib/llm/config'
import { embedText, embeddingToBuffer } from './embed'

/**
 * Re-embed all memory_items with the currently-configured embeddings model.
 * Runs in batches so a big store doesn't hog the event loop.
 *
 * Returns counts: { total, updated, skipped, failed }.
 */
export async function reindexMemory(options: { force?: boolean } = {}): Promise<{
  total: number
  updated: number
  skipped: number
  failed: number
}> {
  const db = getDatabase()
  const cfg = getEmbeddingsConfig()
  const target = cfg.model

  const rows = db
    .prepare(
      options.force
        ? 'SELECT id, content FROM memory_items'
        : 'SELECT id, content FROM memory_items WHERE embedding IS NULL OR embedding_model IS NULL OR embedding_model != ?'
    )
    .all(...(options.force ? [] : [target])) as Array<{ id: number; content: string }>

  const total = rows.length
  let updated = 0
  let skipped = 0
  let failed = 0

  const update = db.prepare(
    'UPDATE memory_items SET embedding = ?, embedding_model = ?, dimensions = ? WHERE id = ?'
  )

  for (const row of rows) {
    if (!row.content || !row.content.trim()) {
      skipped++
      continue
    }
    const vec = await embedText(row.content)
    if (!vec) {
      failed++
      continue
    }
    update.run(embeddingToBuffer(vec), target, vec.length, row.id)
    updated++
  }

  return { total, updated, skipped, failed }
}
