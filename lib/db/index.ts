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
  }

  return db
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

