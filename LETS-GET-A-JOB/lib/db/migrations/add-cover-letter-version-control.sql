-- Migration: Add version control fields to cover_letter_versions table
-- Date: 2025-01-23
-- Description: Adds git-like version control with parent tracking, version numbers, and branches

-- Add new columns to cover_letter_versions table
ALTER TABLE cover_letter_versions ADD COLUMN parent_version_id INTEGER REFERENCES cover_letter_versions(id) ON DELETE SET NULL;
ALTER TABLE cover_letter_versions ADD COLUMN version_number TEXT DEFAULT 'v1.0';
ALTER TABLE cover_letter_versions ADD COLUMN branch_name TEXT DEFAULT 'main';
ALTER TABLE cover_letter_versions ADD COLUMN is_active BOOLEAN DEFAULT 1;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cover_parent_version ON cover_letter_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_cover_branch ON cover_letter_versions(user_id, branch_name);
CREATE INDEX IF NOT EXISTS idx_cover_active ON cover_letter_versions(user_id, is_active);

-- Update existing records to have version numbers based on creation order
UPDATE cover_letter_versions 
SET version_number = 'v1.' || (
  SELECT COUNT(*) 
  FROM cover_letter_versions c2 
  WHERE c2.user_id = cover_letter_versions.user_id 
  AND c2.id <= cover_letter_versions.id
)
WHERE version_number IS NULL OR version_number = 'v1.0';

-- Add cover_letter_version_id to job_applications table
ALTER TABLE job_applications ADD COLUMN cover_letter_version_id INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_cover_version ON job_applications(cover_letter_version_id);

