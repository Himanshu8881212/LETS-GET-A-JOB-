-- Observability for every LLM call. Captures feature, provider, model,
-- token counts, latency, errors, and a preview of the last user message +
-- first response chunk so debugging doesn't require re-running prompts.

CREATE TABLE IF NOT EXISTS llm_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  prompt_preview TEXT,
  response_preview TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  elapsed_ms INTEGER,
  tool_calls_count INTEGER DEFAULT 0,
  finish_reason TEXT,
  attempt INTEGER DEFAULT 1,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_calls_created ON llm_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_calls_feature ON llm_calls(feature);
CREATE INDEX IF NOT EXISTS idx_llm_calls_error ON llm_calls(error);
