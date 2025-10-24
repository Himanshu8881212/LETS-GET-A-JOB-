-- Add cover_letter_version_id to job_applications table
-- This allows tracking which cover letter version was used for each job application

ALTER TABLE job_applications ADD COLUMN cover_letter_version_id INTEGER;

-- Add foreign key constraint (note: SQLite doesn't support adding FK constraints to existing tables,
-- so this is just for documentation. The constraint will be enforced in application code)
-- FOREIGN KEY (cover_letter_version_id) REFERENCES cover_letter_versions(id) ON DELETE SET NULL

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_cover_letter_version ON job_applications(cover_letter_version_id);

