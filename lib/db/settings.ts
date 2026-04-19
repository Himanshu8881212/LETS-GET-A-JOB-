import { getDatabase } from './index'
import { encryptSecret, maybeDecrypt } from '@/lib/crypto/secrets'

interface SettingsRow {
  key: string
  value: string
}

/**
 * Which settings keys hold secrets that must be encrypted at rest.
 * Anything matching these patterns is encrypted on write and decrypted on
 * read. Non-matching keys pass through unchanged.
 *
 * Adding a new secret? Extend this list — a plaintext row will upgrade the
 * next time it's rewritten, but until then it stays in whatever form it's
 * already in (we accept both).
 */
const SECRET_PATTERNS: RegExp[] = [
  /apikey$/i,
  /api_key$/i,
  /\.apiKey$/i,
  /secret$/i,
  /token$/i,
  /password$/i,
]

function isSecret(key: string): boolean {
  return SECRET_PATTERNS.some(re => re.test(key))
}

/** Read every settings row into a plain object. Secrets are decrypted. */
export function readAllSettings(): Record<string, string> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as SettingsRow[]
  const out: Record<string, string> = {}
  for (const r of rows) {
    out[r.key] = isSecret(r.key) ? maybeDecrypt(r.value) : r.value
  }
  return out
}

export function readSetting(key: string): string | undefined {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | SettingsRow
    | undefined
  if (!row) return undefined
  return isSecret(key) ? maybeDecrypt(row.value) : row.value
}

export function upsertSettings(entries: Record<string, string | null | undefined>): void {
  const db = getDatabase()
  const set = db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
  )
  const del = db.prepare('DELETE FROM app_settings WHERE key = ?')

  const tx = db.transaction((items: Record<string, string | null | undefined>) => {
    for (const [k, v] of Object.entries(items)) {
      if (v === null || v === undefined || v === '') {
        del.run(k)
      } else {
        set.run(k, isSecret(k) ? encryptSecret(v) : v)
      }
    }
  })
  tx(entries)
}

export function deleteSetting(key: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM app_settings WHERE key = ?').run(key)
}
