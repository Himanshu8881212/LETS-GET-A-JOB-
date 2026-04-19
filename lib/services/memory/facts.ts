import { getDatabase } from '@/lib/db'

export type FactSource = 'manual' | 'chat' | 'profile' | 'inferred' | 'unknown'

/**
 * Source-ranked precedence. Higher rank wins on conflict.
 *   manual   — user edited in the Memory UI. Canonical.
 *   chat     — extracted from the user's own chat message. Trusted.
 *   profile  — extracted from a profile JSON (may be sample/reference data).
 *   inferred — other heuristics.
 *   unknown  — legacy rows with no source.
 */
const SOURCE_RANK: Record<string, number> = {
  manual: 4,
  chat: 3,
  profile: 2,
  inferred: 1,
  unknown: 0,
}

function rankOf(source: string | null | undefined): number {
  if (!source) return 0
  return SOURCE_RANK[source] ?? 0
}

export interface Fact {
  id: number
  subject: string
  predicate: string
  object: string
  confidence: number
  source: FactSource
  sourceItemId: number | null
  validFrom: string
  validUntil: string | null
  createdAt: string
}

interface FactRow {
  id: number
  subject: string
  predicate: string
  object: string
  confidence: number
  source: string | null
  source_item_id: number | null
  valid_from: string
  valid_until: string | null
  created_at: string
}

function rowToFact(r: FactRow): Fact {
  return {
    id: r.id,
    subject: r.subject,
    predicate: r.predicate,
    object: r.object,
    confidence: r.confidence,
    source: ((r.source as FactSource) || 'unknown'),
    sourceItemId: r.source_item_id,
    validFrom: r.valid_from,
    validUntil: r.valid_until,
    createdAt: r.created_at,
  }
}

export interface AssertOptions {
  confidence?: number
  sourceItemId?: number
  source?: FactSource
}

/**
 * Assert a fact.
 *
 * Precedence rules when a conflict exists for (subject, predicate):
 *   - Same object as existing    → refresh confidence/source if stronger.
 *   - New source rank >= existing → existing invalidated, new becomes current.
 *   - New source rank <  existing → new is recorded but immediately invalidated
 *                                    (audit trail). Existing stays current.
 *
 * This means a sample-profile extraction cannot overwrite a chat-asserted
 * user fact, and nothing can overwrite a manual UI edit except another
 * manual edit.
 */
export function assertFact(
  subject: string,
  predicate: string,
  object: string,
  opts?: AssertOptions
): Fact {
  const db = getDatabase()
  const newSource: FactSource = opts?.source || 'unknown'
  const newRank = rankOf(newSource)
  const newConfidence = opts?.confidence ?? 1.0

  const existing = db
    .prepare(
      'SELECT * FROM memory_facts WHERE subject = ? AND predicate = ? AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)'
    )
    .all(subject, predicate) as FactRow[]

  const tx = db.transaction((): number => {
    for (const row of existing) {
      const existingRank = rankOf(row.source)

      if (row.object === object) {
        // Same value — tune metadata if incoming signal is stronger.
        if (newConfidence > row.confidence) {
          db.prepare('UPDATE memory_facts SET confidence = ? WHERE id = ?').run(newConfidence, row.id)
        }
        if (newRank > existingRank) {
          db.prepare('UPDATE memory_facts SET source = ? WHERE id = ?').run(newSource, row.id)
        }
        return row.id
      }

      // Conflicting objects.
      if (newRank >= existingRank) {
        // Accept the new assertion. Supersede the old one.
        db.prepare('UPDATE memory_facts SET valid_until = CURRENT_TIMESTAMP WHERE id = ?').run(row.id)
        // fall through to INSERT below
      } else {
        // Incoming is weaker. Record it as history (invalid from day one) so
        // the audit trail is preserved but it never wins retrieval.
        db.prepare(
          `INSERT INTO memory_facts (subject, predicate, object, confidence, source, source_item_id, valid_until)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).run(subject, predicate, object, newConfidence, newSource, opts?.sourceItemId ?? null)
        return row.id // still-current = the existing one
      }
    }

    // Insert as current.
    const info = db
      .prepare(
        `INSERT INTO memory_facts (subject, predicate, object, confidence, source, source_item_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(subject, predicate, object, newConfidence, newSource, opts?.sourceItemId ?? null)
    return info.lastInsertRowid as number
  })
  const id = tx()
  const row = db.prepare('SELECT * FROM memory_facts WHERE id = ?').get(id) as FactRow
  return rowToFact(row)
}

export function retractFact(id: number): void {
  const db = getDatabase()
  db.prepare('UPDATE memory_facts SET valid_until = CURRENT_TIMESTAMP WHERE id = ?').run(id)
}

export function factsAbout(subject: string): Fact[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      'SELECT * FROM memory_facts WHERE subject = ? AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP) ORDER BY predicate'
    )
    .all(subject) as FactRow[]
  return rows.map(rowToFact)
}

export function getFact(id: number): Fact | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM memory_facts WHERE id = ?').get(id) as FactRow | undefined
  return row ? rowToFact(row) : null
}

/**
 * Manual edits from the UI always write source='manual' so they can't be
 * silently overwritten by profile extraction or background inference.
 */
export function updateFact(
  id: number,
  patch: { object?: string; confidence?: number }
): Fact | null {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM memory_facts WHERE id = ?').get(id) as FactRow | undefined
  if (!existing) return null
  const fields: string[] = []
  const params: any[] = []
  if (patch.object !== undefined) {
    fields.push('object = ?')
    params.push(patch.object)
  }
  if (patch.confidence !== undefined) {
    fields.push('confidence = ?')
    params.push(patch.confidence)
  }
  fields.push('source = ?')
  params.push('manual')
  params.push(id)
  db.prepare(`UPDATE memory_facts SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  const row = db.prepare('SELECT * FROM memory_facts WHERE id = ?').get(id) as FactRow
  return rowToFact(row)
}

export function deleteFact(id: number): boolean {
  const db = getDatabase()
  const info = db.prepare('DELETE FROM memory_facts WHERE id = ?').run(id)
  return info.changes > 0
}

export function factsByPredicate(predicate: string, limit = 50): Fact[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      'SELECT * FROM memory_facts WHERE predicate = ? AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT ?'
    )
    .all(predicate, limit) as FactRow[]
  return rows.map(rowToFact)
}

/**
 * Bulk wipe — mostly useful after testing with sample profiles.
 * Returns count deleted.
 */
export function deleteFactsBySource(source: FactSource, subject?: string): number {
  const db = getDatabase()
  const where: string[] = ['source = ?']
  const params: any[] = [source]
  if (subject) {
    where.push('subject = ?')
    params.push(subject)
  }
  const info = db.prepare(`DELETE FROM memory_facts WHERE ${where.join(' AND ')}`).run(...params)
  return info.changes
}
