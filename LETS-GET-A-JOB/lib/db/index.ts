import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'app.db')
const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'db', 'schema.sql')

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
  }
  
  return db
}

function initializeSchema(database: Database.Database) {
  // Check if database is initialized
  const tables = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get()
  
  if (!tables) {
    console.log('Initializing database schema...')
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    database.exec(schema)
    console.log('Database schema initialized successfully')
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

