import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = path.join(process.cwd(), 'data', 'jobs.db')

// Ensure data directory exists
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize database
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('applied', 'interview', 'offer', 'rejected')),
    application_date TEXT NOT NULL,
    salary TEXT,
    location TEXT,
    notes TEXT,
    resume_version TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (job_id) REFERENCES job_applications(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS resume_versions (
    id TEXT PRIMARY KEY,
    version_name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cover_letter_versions (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    version_name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_job_status ON job_applications(status);
  CREATE INDEX IF NOT EXISTS idx_job_date ON job_applications(application_date);
  CREATE INDEX IF NOT EXISTS idx_status_history_job ON status_history(job_id);
  CREATE INDEX IF NOT EXISTS idx_resume_version ON job_applications(resume_version);
`)

export default db

