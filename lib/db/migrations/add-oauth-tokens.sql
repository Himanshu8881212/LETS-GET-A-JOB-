-- OAuth tokens for providers that support subscription-based login.
-- One row per provider (openai_codex | google_antigravity).
-- access_token is short-lived; we refresh transparently using refresh_token.

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  id_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  account_email TEXT,
  account_name TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_tokens(provider);

CREATE TRIGGER IF NOT EXISTS update_oauth_tokens_timestamp
AFTER UPDATE ON oauth_tokens
BEGIN
  UPDATE oauth_tokens SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
