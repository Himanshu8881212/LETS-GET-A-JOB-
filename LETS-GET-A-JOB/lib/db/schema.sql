-- SQLite Database Schema for Resume & Cover Letter Generator
-- Version: 1.0.0

-- Users table (for future multi-user support)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job Applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  job_url TEXT,
  status TEXT NOT NULL DEFAULT 'applied', -- applied, interviewing, offer, rejected, accepted, withdrawn
  salary_range TEXT,
  job_description TEXT,
  notes TEXT,
  applied_date DATE,
  follow_up_date DATE,
  interview_date DATETIME,
  offer_date DATE,
  rejection_date DATE,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  source TEXT, -- linkedin, indeed, company_website, referral, etc.
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Resume Versions table (with git-like version control)
CREATE TABLE IF NOT EXISTS resume_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  description TEXT,
  data_json TEXT NOT NULL, -- Full resume data as JSON
  pdf_path TEXT, -- Path to generated PDF file
  file_size INTEGER, -- Size in bytes
  is_favorite BOOLEAN DEFAULT 0,
  tags TEXT, -- Comma-separated tags for categorization

  -- Version Control Fields
  parent_version_id INTEGER, -- Reference to parent version (for branching)
  version_number TEXT DEFAULT 'v1.0', -- Semantic version number (v1.0, v1.1, v2.0, etc.)
  branch_name TEXT DEFAULT 'main', -- Branch name (main, tech-focused, creative, etc.)
  is_active BOOLEAN DEFAULT 1, -- Whether this version is currently active

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_version_id) REFERENCES resume_versions(id) ON DELETE SET NULL
);

-- Cover Letter Versions table
CREATE TABLE IF NOT EXISTS cover_letter_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  description TEXT,
  data_json TEXT NOT NULL, -- Full cover letter data as JSON
  pdf_path TEXT, -- Path to generated PDF file
  file_size INTEGER, -- Size in bytes
  is_favorite BOOLEAN DEFAULT 0,
  tags TEXT, -- Comma-separated tags for categorization
  job_application_id INTEGER, -- Link to specific job application
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE SET NULL
);

-- Activity Logs table (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- create, update, delete, download, generate_pdf, etc.
  entity_type TEXT NOT NULL, -- resume, cover_letter, job_application
  entity_id INTEGER,
  details TEXT, -- JSON with additional details
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job Application Status History (track status changes)
CREATE TABLE IF NOT EXISTS job_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_application_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_session ON users(session_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_jobs_applied_date ON job_applications(applied_date);
CREATE INDEX IF NOT EXISTS idx_resume_user ON resume_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_created ON resume_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cover_user ON cover_letter_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_created ON cover_letter_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cover_job ON cover_letter_versions(job_application_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_job ON job_status_history(job_application_id);

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON job_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_applied_date ON job_applications(user_id, applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user_priority ON job_applications(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_resume_user_created ON resume_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_user_favorite ON resume_versions(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_resume_parent_version ON resume_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_resume_branch ON resume_versions(user_id, branch_name);
CREATE INDEX IF NOT EXISTS idx_resume_active ON resume_versions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cover_user_created ON cover_letter_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cover_user_favorite ON cover_letter_versions(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_activity_user_timestamp ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_history_job_created ON job_status_history(job_application_id, created_at DESC);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_jobs_timestamp 
AFTER UPDATE ON job_applications
BEGIN
  UPDATE job_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_resume_timestamp 
AFTER UPDATE ON resume_versions
BEGIN
  UPDATE resume_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cover_timestamp 
AFTER UPDATE ON cover_letter_versions
BEGIN
  UPDATE cover_letter_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to log job status changes
CREATE TRIGGER IF NOT EXISTS log_job_status_change
AFTER UPDATE OF status ON job_applications
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO job_status_history (job_application_id, old_status, new_status)
  VALUES (NEW.id, OLD.status, NEW.status);
END;

