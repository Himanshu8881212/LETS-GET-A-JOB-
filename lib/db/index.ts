import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'app.db')
const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'db', 'schema.sql')
const MIGRATIONS_DIR = path.join(process.cwd(), 'lib', 'db', 'migrations')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Create database connection
let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    })

    // Enable foreign keys
    db.pragma('foreign_keys = ON')

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL')

    // Initialize schema if needed
    initializeSchema(db)

    // Run migrations
    runMigrations(db)

    // Housekeeping — best-effort, never fatal.
    try {
      runMaintenanceTasks(db)
    } catch (err: any) {
      console.warn('[db] maintenance skipped:', err?.message || err)
    }
  }

  return db
}

// ─────────────────────────────────────────────────────────────────────────
// Maintenance. Runs once per process start. Bounded deletes + WAL checkpoint
// + PRAGMA optimize. Anything genuinely expensive (full VACUUM) is opt-in.
// ─────────────────────────────────────────────────────────────────────────

const MAINTENANCE_RETENTION = {
  /** Keep activity logs for 90 days. Used by the dashboard "recent activity" feed. */
  activity_logs_days: 90,
  /** Keep per-call LLM telemetry for 30 days. Bigger rows, lower retention. */
  llm_calls_days: 30,
  /** Keep search-memory "links" entries for 180 days. */
  memory_links_days: 180,
  /** Hard cap on active memory_items — oldest-first invalidation when exceeded. */
  max_active_memory_items: 10_000,
}

function runMaintenanceTasks(database: Database.Database) {
  // Delete old activity logs if the table exists.
  const tbls = (
    database
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[]
  ).map(t => t.name)

  if (tbls.includes('activity_logs')) {
    database
      .prepare(
        `DELETE FROM activity_logs WHERE created_at < datetime('now', '-' || ? || ' days')`,
      )
      .run(MAINTENANCE_RETENTION.activity_logs_days)
  }

  if (tbls.includes('llm_calls')) {
    database
      .prepare(
        `DELETE FROM llm_calls WHERE created_at < datetime('now', '-' || ? || ' days')`,
      )
      .run(MAINTENANCE_RETENTION.llm_calls_days)
  }

  if (tbls.includes('memory_items')) {
    // Invalidate oldest link entries past 180 days (cheap storage win; links
    // are dedupe markers, not content).
    database
      .prepare(
        `UPDATE memory_items
         SET valid_until = CURRENT_TIMESTAMP
         WHERE valid_until IS NULL
           AND wing = 'links'
           AND created_at < datetime('now', '-' || ? || ' days')`,
      )
      .run(MAINTENANCE_RETENTION.memory_links_days)

    // Hard cap on active rows: if over the limit, invalidate the oldest
    // until we're back under. Prefer invalidating `links` before content.
    const active = (
      database
        .prepare('SELECT COUNT(*) AS c FROM memory_items WHERE valid_until IS NULL')
        .get() as { c: number }
    ).c
    if (active > MAINTENANCE_RETENTION.max_active_memory_items) {
      const over = active - MAINTENANCE_RETENTION.max_active_memory_items
      database
        .prepare(
          `UPDATE memory_items
           SET valid_until = CURRENT_TIMESTAMP
           WHERE id IN (
             SELECT id FROM memory_items
             WHERE valid_until IS NULL
             ORDER BY (wing = 'links') DESC, created_at ASC
             LIMIT ?
           )`,
        )
        .run(over)
    }
  }

  // WAL checkpoint + planner stats refresh. Cheap.
  database.pragma('wal_checkpoint(PASSIVE)')
  database.pragma('optimize')
}

/** Manual full VACUUM — only call from a maintenance endpoint, not hot path. */
export function vacuumDatabase() {
  const database = getDatabase()
  database.pragma('wal_checkpoint(TRUNCATE)')
  database.exec('VACUUM')
}

function initializeSchema(database: Database.Database) {
  // Check if database is initialized
  const tables = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get()

  if (!tables) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Initializing database schema...')
    }
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    database.exec(schema)
    if (process.env.NODE_ENV === 'development') {
      console.log('Database schema initialized successfully')
    }
  }
}

function runMigrations(database: Database.Database) {
  // Create migrations tracking table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Check if migrations directory exists
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('No migrations directory found, skipping migrations')
    }
    return
  }

  // Get list of already applied migrations
  const appliedMigrations = database.prepare('SELECT filename FROM schema_migrations').all() as { filename: string }[]
  const appliedSet = new Set(appliedMigrations.map(m => m.filename))

  // Get list of migration files
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort() // Sort to ensure consistent order

  if (process.env.NODE_ENV === 'development' && migrationFiles.length > 0) {
    console.log(`Found ${migrationFiles.length} migration files, ${appliedSet.size} already applied`)
  }

  // Run each migration
  for (const filename of migrationFiles) {
    if (appliedSet.has(filename)) {
      continue
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Applying migration: ${filename}`)
    }

    const migrationPath = path.join(MIGRATIONS_DIR, filename)
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    try {
      // Run migration in a transaction
      database.exec('BEGIN TRANSACTION')

      // Split SQL into individual statements and execute each one
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        try {
          database.exec(statement)
        } catch (err: any) {
          // Ignore "duplicate column" errors (column already exists)
          if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`  Column already exists, skipping`)
            }
          } else {
            throw err
          }
        }
      }

      // Record migration as applied
      database.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(filename)

      database.exec('COMMIT')

      if (process.env.NODE_ENV === 'development') {
        console.log(`Successfully applied ${filename}`)
      }
    } catch (error: any) {
      try {
        database.exec('ROLLBACK')
      } catch (rollbackError) {
        // Ignore rollback errors (transaction may not be active)
      }
      console.error(`Error applying ${filename}:`, error.message)
      // Continue with other migrations instead of stopping
    }
  }
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('exit', closeDatabase)
  process.on('SIGINT', () => {
    closeDatabase()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    closeDatabase()
    process.exit(0)
  })
}

export default getDatabase

