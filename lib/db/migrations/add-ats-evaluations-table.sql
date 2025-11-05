-- Migration: Add ATS Evaluations table
-- Date: 2025-10-24
-- Description: Stores processed data from job description, resume, and cover letter before evaluation

-- Create ATS Evaluations table
CREATE TABLE IF NOT EXISTS ats_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  -- Source data
  job_url TEXT,
  job_description_text TEXT NOT NULL,
  resume_text TEXT NOT NULL,
  cover_letter_text TEXT NOT NULL,
  
  -- Evaluation results (stored as JSON)
  evaluation_result TEXT, -- JSON with full evaluation data
  overall_score REAL, -- Weighted score for quick filtering
  
  -- Metadata
  resume_version_id INTEGER,
  cover_letter_version_id INTEGER,
  job_application_id INTEGER,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_version_id) REFERENCES resume_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (cover_letter_version_id) REFERENCES cover_letter_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ats_eval_user ON ats_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_ats_eval_created ON ats_evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_eval_score ON ats_evaluations(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_ats_eval_resume ON ats_evaluations(resume_version_id);
CREATE INDEX IF NOT EXISTS idx_ats_eval_cover ON ats_evaluations(cover_letter_version_id);
CREATE INDEX IF NOT EXISTS idx_ats_eval_job ON ats_evaluations(job_application_id);

