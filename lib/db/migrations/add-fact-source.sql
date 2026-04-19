-- Facts learn provenance. Source rank drives precedence on conflict:
--   manual=4 (user edited in Memory UI)
--   chat=3   (extracted from user's chat message)
--   profile=2(extracted from profile JSON that may be sample data)
--   inferred=1 (other heuristics)
-- Rows predating this migration keep source=NULL which rankOf() treats as 0,
-- so any new assertion from chat/profile/manual can overwrite them.

ALTER TABLE memory_facts ADD COLUMN source TEXT;
CREATE INDEX IF NOT EXISTS idx_facts_source ON memory_facts(source);
