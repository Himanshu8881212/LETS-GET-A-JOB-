# Prompt hardening — follow-ups

This is the open list of AI-service weaknesses that were identified in the 2026-04-19 audit but **not yet fixed**. The bulk of the audit has already landed (see `config/prompts/` + `lib/services/ai/validators.ts` + per-service wiring). What's left is listed below, in rough priority order.

## Priority 1 — close obvious holes

### Resume validation: retry on violation
`validateResume` currently tags `_metadata.validation` but doesn't trigger a retry. If `bullet_cap_respected === false` or there are weak-verb openers, we should feed the violations back to Forge and retry once (same pattern as `cover-letter-gen`).

### ATS: keyword coverage verifier
`hard_skills.coverage_pct` is the model's self-report. Cross-check it: do a token-intersection on (JD required skills) ∩ (resume text) and flag gaps the model missed. A low model-coverage + high manual-coverage mismatch is a sign of sloppy reading.

### JD parser: signal truncation to callers
The service now adds a `[Parser notes]` suffix when input was truncated, but callers still pipe the whole output into resume-gen unchanged. Expose `{ output, notes }` shape and let the UI surface a warning.

### Apply-agent: upload-failure structured reporting
Today, an upload failure is a free-text note in the summary. Add a structured field to the result JSON (`upload_failures: [{path, reason}]`) so the UI can render a "these files didn't upload" strip that the human can retry.

## Priority 2 — deeper ATS

### Real ATS parseability proxy
M5 is heuristic ("contact info in first 3 lines, standard headers, consistent dates"). Swap in a pre-LLM pass that:
- Checks for multi-column text (heuristic: paragraphs where lines alternate short/long)
- Detects embedded images by looking at the PDF byte signature
- Runs the resume through `pdf2json` and measures text-order scramble

Then feed the structured findings to the LLM as evidence, instead of asking it to infer.

### Seniority-weighted scoring
The prompt mentions seniority adjustments for M2/M8/M10 but the overall match score still uses flat weights. Apply a small multiplier: for `junior`, M2 and M8 count a bit less; for `senior+`, M2 and M3 count a bit more.

### Title alignment: responsibility-scope check
Right now it's string similarity + discipline. Add a scope check: does the resume's current role mention direct reports / budget / stakeholder breadth that matches a JD asking for "lead"? Quote-backed.

## Priority 3 — generation polish

### Metric-invention audit for resume-gen
`resume-gen.ts` checks for bullets missing metrics, but doesn't detect **invented** metrics. Add a post-gen pass that lists every number in the output and verifies each appears in `resume_data`. If a number in the output has no source, flag it.

### Cover-letter: company-research verifier
Rule 7 says "one specific, verifiable reference to the company from the JD." We could substring-check: every company-specific noun-phrase in the closing paragraph should appear in the JD.

### Polish-section: voice calibration
We lowered temperature and added role-aware verb hints. Next step: add a `voiceProfile` field (`formal | direct | casual`) per user, derived from their past writing, and pass it to the prompt.

## Priority 4 — infra

### Prompt A/B harness
Run two prompts on the same input and compare outcomes (ATS score, user acceptance). A `config/prompts/experiments/` directory + an `X-Prompt-Version` header on the API could do this.

### Per-user prompt overrides
The JSON today is global. A future refinement: per-user `db.user_prompt_overrides(user_id, prompt_id, json)` stored in SQLite, loaded by the same loader.

### Token-budget autodetect
`maxTokens` is hand-tuned per prompt. For long inputs we sometimes truncate. Auto-size based on input length and provider context window.

### Telemetry hook
Log `{prompt_id, version, latency_ms, output_tokens, validation_errors}` per call so we can track which prompt versions regress and on what axis.

## Done — for reference

Already landed in 2026-04-19:

- `config/prompts/*.json` for all 9 services, loader with fallback + zod schema.
- Per-mode temperature ramping for resume-gen (tailor/optimize/rewrite).
- Cover-letter: word-count + forbidden-opener validation + one retry.
- ATS: quote-substring verification + red-flag deductions + title-alignment weight bump (10 → 15).
- Polish: length band enforcement + retry.
- JD parser: language detection + truncation warnings.
- Document parser: password-protected / corrupt PDF detection + coherence check.
- Scout: temperature lowered to 0.3 for grounded advice.
- Apply agent: expanded forbidden-button list (added Review/Finalize/Place Application etc.), 12k/8k/6k context limits, explicit EEO/consent/essay/file-upload strategies, JSON-driven task template.
- Prompt-injection escape on every user-content interpolation.
