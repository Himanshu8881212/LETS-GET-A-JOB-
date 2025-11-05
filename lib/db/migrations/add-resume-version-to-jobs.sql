-- Add resume_version_id to job_applications table
ALTER TABLE job_applications ADD COLUMN resume_version_id INTEGER;

-- Add foreign key constraint (note: SQLite doesn't support adding FK constraints to existing tables,
-- so this is just for documentation. The constraint will be enforced in application code)
-- FOREIGN KEY (resume_version_id) REFERENCES resume_versions(id) ON DELETE SET NULL

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_resume_version ON job_applications(resume_version_id);

