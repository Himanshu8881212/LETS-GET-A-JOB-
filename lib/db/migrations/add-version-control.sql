-- Migration: Add version control fields to resume_versions table
-- Date: 2025-01-23
-- Description: Adds git-like version control with parent tracking, version numbers, and branches

-- Add new columns to resume_versions table
ALTER TABLE resume_versions ADD COLUMN parent_version_id INTEGER REFERENCES resume_versions(id) ON DELETE SET NULL;
ALTER TABLE resume_versions ADD COLUMN version_number TEXT DEFAULT 'v1.0';
ALTER TABLE resume_versions ADD COLUMN branch_name TEXT DEFAULT 'main';
ALTER TABLE resume_versions ADD COLUMN is_active BOOLEAN DEFAULT 1;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_resume_parent_version ON resume_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_resume_branch ON resume_versions(user_id, branch_name);
CREATE INDEX IF NOT EXISTS idx_resume_active ON resume_versions(user_id, is_active);

-- Update existing records to have version numbers based on creation order
UPDATE resume_versions 
SET version_number = 'v1.' || (
  SELECT COUNT(*) 
  FROM resume_versions r2 
  WHERE r2.user_id = resume_versions.user_id 
  AND r2.id <= resume_versions.id
)
WHERE version_number IS NULL OR version_number = 'v1.0';

