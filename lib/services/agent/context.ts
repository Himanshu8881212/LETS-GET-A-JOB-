import { getDatabase } from '@/lib/db'
import { countByWing, factsAbout } from '@/lib/services/memory'
import { searchMemory, type SearchHit } from '@/lib/services/memory/search'

/**
 * Context is split into two strictly-fenced layers to prevent "context rot"
 * (old session material bleeding into a new unrelated task):
 *
 *   1. AMBIENT AWARENESS — always present, compact, high-signal.
 *      <palace_index>      — counts per wing, tells the model what exists
 *      <user_facts>        — durable assertions about the user
 *      <workspace_summary> — recent resumes + eval scores (names/dates only)
 *
 *   2. REFERENCE MATERIAL — only attached when the calling service asks for it,
 *      fenced in <reference_material> with an explicit <reference_policy>
 *      telling the model to treat it as style guidance, not input.
 *
 * The agent loop (L3) defaults to ambient-only. It must call `search_memory`
 * to pull reference material on demand — the model decides, not us.
 *
 * Services that can't call tools (generation/tailoring routes invoked from the
 * UI) may pass `attachReferences: true` to get a small, wing-scoped, filtered
 * pull — still fenced and policed.
 */

export interface BuildContextInput {
  /** Free-form signal for what the current task is about — used for vector recall. */
  query: string
  /** Wings to search when attaching references. Small list = tight scope. */
  wings?: string[]
  /** When true, proactively retrieve top-k references and fence them. */
  attachReferences?: boolean
  /** Max reference items. Default 3. Keep small. */
  k?: number
  /** Drop hits below this similarity. Default 0.55. */
  minSimilarity?: number
  /** Include recent resumes/evals as ambient awareness (names only, never content). */
  includeWorkspaceSummary?: boolean
}

export async function buildAgentContext(input: BuildContextInput): Promise<string> {
  const blocks: string[] = []

  // ─────────────── Ambient awareness ───────────────
  const palace = buildPalaceIndex()
  if (palace) blocks.push(palace)

  const facts = buildUserFacts()
  if (facts) blocks.push(facts)

  if (input.includeWorkspaceSummary) {
    const ws = buildWorkspaceSummary()
    if (ws) blocks.push(ws)
  }

  // ─────────────── Reference material (opt-in) ───────────────
  if (input.attachReferences) {
    const ref = await buildReferenceMaterial(input).catch(() => '')
    if (ref) blocks.push(ref)
  }

  if (!blocks.length) return ''
  return blocks.join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Ambient awareness blocks
// ─────────────────────────────────────────────────────────────────────────

function buildPalaceIndex(): string {
  const counts = countByWing()
  if (!counts.length) {
    return '<palace_index empty="true" note="No memories yet. Use save_memory to start building durable context." />'
  }
  const entries = counts
    .map(c => `  <wing name="${escapeAttr(c.wing)}" count="${c.count}" />`)
    .join('\n')
  return `<palace_index note="Counts only. Call search_memory(query, wings?) to pull content.">\n${entries}\n</palace_index>`
}

function buildUserFacts(): string {
  const facts = factsAbout('user')
  if (!facts.length) return ''
  const rows = facts
    .map(f => `  <fact predicate="${escapeAttr(f.predicate)}">${escapeText(f.object)}</fact>`)
    .join('\n')
  return `<user_facts note="Canonical. USE these to personalize naturally (e.g. address user by first_name). Never announce or reference that you have this information.">\n${rows}\n</user_facts>`
}

function buildWorkspaceSummary(): string {
  const resumes = readRecentResumes()
  const evals = readRecentEvals()
  if (!resumes.length && !evals.length) return ''

  const parts: string[] = ['<workspace_summary note="Names and dates only. No content. Use other tools to load.">']
  if (resumes.length) {
    parts.push('  <recent_resumes>')
    for (const r of resumes) {
      parts.push(
        `    <resume name="${escapeAttr(r.version_name)}" version="${escapeAttr(r.version_number)}" branch="${escapeAttr(r.branch_name)}" created="${r.created_at.slice(0, 10)}" />`
      )
    }
    parts.push('  </recent_resumes>')
  }
  if (evals.length) {
    parts.push('  <recent_evaluations>')
    for (const e of evals) {
      parts.push(
        `    <evaluation date="${e.created_at.slice(0, 10)}" score="${e.overall_score?.toFixed(1) ?? 'n/a'}" />`
      )
    }
    parts.push('  </recent_evaluations>')
  }
  parts.push('</workspace_summary>')
  return parts.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Reference material — retrieval + fencing
// ─────────────────────────────────────────────────────────────────────────

const REFERENCE_POLICY = `<reference_policy>
These items are from your memory palace. They are REFERENCE ONLY.
- Use them as style/approach guidance for the CURRENT task inside <task>.
- Do NOT copy content verbatim. Do NOT let old facts, companies, or roles leak into the new output.
- If an item is not directly relevant to the CURRENT task, ignore it entirely.
- When in doubt, prefer the explicit inputs in <task> over anything in <reference_material>.
</reference_policy>`

async function buildReferenceMaterial(input: BuildContextInput): Promise<string> {
  const hits = await searchMemory({
    query: input.query,
    wings: input.wings,
    k: input.k ?? 3,
    currentOnly: true,
    outcomeWeight: 0.25,
  })

  const minSim = input.minSimilarity ?? 0.55
  const filtered = hits.filter(h => h.similarity >= minSim)
  if (!filtered.length) return ''

  const items = filtered.map(renderReferenceItem).join('\n')
  return `${REFERENCE_POLICY}\n<reference_material count="${filtered.length}">\n${items}\n</reference_material>`
}

function renderReferenceItem(hit: SearchHit): string {
  const body = truncate(hit.content, 360)
  const attrs = [
    `id="${hit.id}"`,
    `wing="${escapeAttr(hit.wing)}"`,
    hit.drawer ? `drawer="${escapeAttr(hit.drawer)}"` : null,
    `similarity="${hit.similarity.toFixed(2)}"`,
    hit.outcomeScore != null ? `outcome="${hit.outcomeScore.toFixed(1)}"` : null,
  ]
    .filter(Boolean)
    .join(' ')
  return `  <item ${attrs}>\n    ${escapeText(body)}\n  </item>`
}

// ─────────────────────────────────────────────────────────────────────────
// Task wrapping — wrap user inputs in <task> so the model can distinguish
// them from context. Services call this when they build user messages.
// ─────────────────────────────────────────────────────────────────────────

export function wrapTask(type: string, body: string): string {
  return `<task type="${escapeAttr(type)}">\n${body}\n</task>`
}

/**
 * Wrap a tool-call result for the agent loop so the model can tell where
 * the content came from. Use for memory search tool responses.
 */
export function wrapToolResult(tag: string, body: string, attrs?: Record<string, string | number>): string {
  const attrStr = attrs
    ? ' ' +
      Object.entries(attrs)
        .map(([k, v]) => `${k}="${escapeAttr(String(v))}"`)
        .join(' ')
    : ''
  return `<${tag}${attrStr}>\n${body}\n</${tag}>`
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

interface LineageRow {
  version_name: string
  version_number: string
  branch_name: string
  created_at: string
}

function readRecentResumes(): LineageRow[] {
  try {
    const db = getDatabase()
    return db
      .prepare(
        'SELECT version_name, version_number, branch_name, created_at FROM resume_versions WHERE is_active = 1 ORDER BY created_at DESC LIMIT 3'
      )
      .all() as LineageRow[]
  } catch {
    return []
  }
}

interface EvalRow {
  overall_score: number | null
  created_at: string
}

function readRecentEvals(): EvalRow[] {
  try {
    const db = getDatabase()
    return db
      .prepare('SELECT overall_score, created_at FROM ats_evaluations ORDER BY created_at DESC LIMIT 3')
      .all() as EvalRow[]
  } catch {
    return []
  }
}
