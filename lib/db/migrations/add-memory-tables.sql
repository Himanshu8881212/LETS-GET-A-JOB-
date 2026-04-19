-- MemPalace-style memory store. Verbatim content + vector search +
-- temporal knowledge graph. No paraphrasing, no summarization.
--
-- Memory is organized spatially:
--   wing   — top-level domain (profile, resume, cover_letter, ats, chat, job)
--   room   — application/session grouping (often a job_application_id or session id)
--   drawer — subtopic or artifact kind (bullet, opening, keyword, feedback, style)
--
-- Embeddings are stored as raw Float32Array bytes in the BLOB column and
-- cosine-compared in JS — avoids the sqlite-vec native extension dependency.

CREATE TABLE IF NOT EXISTS memory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wing TEXT NOT NULL,
  room TEXT,
  drawer TEXT,
  content TEXT NOT NULL,
  metadata_json TEXT,
  embedding BLOB,
  embedding_model TEXT,
  dimensions INTEGER,
  outcome_score REAL,
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memory_wing ON memory_items(wing);
CREATE INDEX IF NOT EXISTS idx_memory_wing_room ON memory_items(wing, room);
CREATE INDEX IF NOT EXISTS idx_memory_valid_until ON memory_items(valid_until);
CREATE INDEX IF NOT EXISTS idx_memory_outcome ON memory_items(outcome_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_created ON memory_items(created_at DESC);

-- Temporal knowledge graph. Every fact has a validity window — facts are
-- superseded by setting valid_until, never deleted. This lets us answer
-- "what did we think was true on <date>" without losing history.
CREATE TABLE IF NOT EXISTS memory_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  source_item_id INTEGER,
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_item_id) REFERENCES memory_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_facts_subject ON memory_facts(subject);
CREATE INDEX IF NOT EXISTS idx_facts_predicate ON memory_facts(predicate);
CREATE INDEX IF NOT EXISTS idx_facts_subject_pred ON memory_facts(subject, predicate);
CREATE INDEX IF NOT EXISTS idx_facts_valid_until ON memory_facts(valid_until);
