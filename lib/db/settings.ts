import { getDatabase } from './index'

interface SettingsRow {
  key: string
  value: string
}

/** Read every settings row into a plain object. */
export function readAllSettings(): Record<string, string> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as SettingsRow[]
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export function readSetting(key: string): string | undefined {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as SettingsRow | undefined
  return row?.value
}

export function upsertSettings(entries: Record<string, string | null | undefined>): void {
  const db = getDatabase()
  const set = db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
  )
  const del = db.prepare('DELETE FROM app_settings WHERE key = ?')

  const tx = db.transaction((items: Record<string, string | null | undefined>) => {
    for (const [k, v] of Object.entries(items)) {
      if (v === null || v === undefined || v === '') {
        del.run(k)
      } else {
        set.run(k, v)
      }
    }
  })
  tx(entries)
}

export function deleteSetting(key: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM app_settings WHERE key = ?').run(key)
}
