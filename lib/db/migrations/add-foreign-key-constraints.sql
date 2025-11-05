-- Migration: Add missing foreign key constraint for cover_letter_version_id
-- Date: 2025-01-23
-- Description: SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we need to recreate the table

-- Step 1: Create new table with proper foreign keys
CREATE TABLE job_applications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  job_url TEXT,
  status TEXT DEFAULT 'applied' CHECK(status IN ('applied', 'interview', 'offer', 'rejected')),
  salary_range TEXT,
  job_description TEXT,
  notes TEXT,
  applied_date DATE,
  follow_up_date DATE,
  interview_date DATE,
  offer_date DATE,
  rejection_date DATE,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  source TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  resume_version_id INTEGER,
  cover_letter_version_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_version_id) REFERENCES resume_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (cover_letter_version_id) REFERENCES cover_letter_versions(id) ON DELETE SET NULL
);

-- Step 2: Copy data from old table
INSERT INTO job_applications_new SELECT * FROM job_applications;

-- Step 3: Drop old table
DROP TABLE job_applications;

-- Step 4: Rename new table
ALTER TABLE job_applications_new RENAME TO job_applications;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_job_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_company ON job_applications(company);
CREATE INDEX IF NOT EXISTS idx_job_applied_date ON job_applications(applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_job_resume_version ON job_applications(resume_version_id);
CREATE INDEX IF NOT EXISTS idx_job_cover_version ON job_applications(cover_letter_version_id);

-- Step 6: Recreate triggers
CREATE TRIGGER IF NOT EXISTS update_job_applications_timestamp 
AFTER UPDATE ON job_applications
BEGIN
  UPDATE job_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

