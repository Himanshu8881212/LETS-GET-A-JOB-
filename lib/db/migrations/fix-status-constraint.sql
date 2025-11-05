-- Fix status CHECK constraint to match schema
-- The constraint currently allows 'interview' but schema uses 'interviewing'

-- Step 1: Create new table with correct constraint
CREATE TABLE job_applications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  job_url TEXT,
  status TEXT DEFAULT 'applied' CHECK(status IN ('applied', 'interviewing', 'offer', 'rejected', 'accepted', 'withdrawn')),
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

-- Step 2: Copy data from old table (convert 'interview' to 'interviewing')
INSERT INTO job_applications_new 
SELECT 
  id, user_id, company, position, location, job_url,
  CASE 
    WHEN status = 'interview' THEN 'interviewing'
    ELSE status
  END as status,
  salary_range, job_description, notes,
  applied_date, follow_up_date, interview_date, offer_date, rejection_date,
  priority, source, contact_name, contact_email, contact_phone,
  resume_version_id, cover_letter_version_id,
  created_at, updated_at
FROM job_applications;

-- Step 3: Drop old table
DROP TABLE job_applications;

-- Step 4: Rename new table
ALTER TABLE job_applications_new RENAME TO job_applications;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_job_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_resume_version ON job_applications(resume_version_id);
CREATE INDEX IF NOT EXISTS idx_job_cover_letter_version ON job_applications(cover_letter_version_id);

