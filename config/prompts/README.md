# Prompt configuration

Every AI feature in Headhunter pulls its system prompt, temperature, and token budget from one of the JSON files in this folder. Edit them to change model behavior — no code change required.

## Files

| File | Used by | What it controls |
|---|---|---|
| `resume_gen.json` | Resume generator (Forge) | System prompt, temperature per mode (tailor/optimize/rewrite), max tokens, validator guards. |
| `cover_letter_gen.json` | Cover-letter generator (Quill) | System prompt, temperature, word-count enforcement. |
| `ats_evaluator.json` | ATS evaluator | 10-metric rubric, weights, quote-verification guard. |
| `jd_parser.json` | Job-description parser | Extraction template, language/truncation notes. |
| `resume_cleaner.json` | Resume PDF cleaner | Noise-strip rules for PDF text restoration. |
| `cover_letter_cleaner.json` | Cover-letter PDF cleaner | Same, for letters. |
| `polish_section.json` | Magic-wand polish | Length budget (80–120%), verb selection hints. |
| `scout.json` | Scout (both chat and agent mode) | Personality, capabilities, personalization rules, and tool usage gated behind "if tools are available this turn". |
| `apply_agent.json` | Apply agent (browser-use) | Task template, forbidden/review button lists, context caps. |

## Schema

```jsonc
{
  "id": "resume_gen",                // must match the file's logical name
  "version": "2026-04-19",           // free-form; logged with every call
  "description": "human-readable",
  "variables": ["job_description", "resume_data"],  // informational
  "model": {
    "temperature": 0.15,
    "maxTokens": 10000,
    "temperatureByMode": {           // optional, resume_gen only
      "tailor": 0.05,
      "optimize": 0.15,
      "rewrite": 0.25
    }
  },
  "guards": { "…": "…" },            // service-specific hints, optional
  "system": "the full system prompt …"
}
```

The loader (`lib/services/ai/prompt-loader.ts`) validates every file with a zod schema. If a file is missing, malformed, or fails validation, the app logs a warning and falls back to the built-in default. **The app will never crash because of a bad prompt config.**

## Editing

1. Open any `.json` file in this folder.
2. Change `system`, bump `version`, adjust `model.temperature` / `model.maxTokens`, etc.
3. Save. In dev mode, the loader re-reads the file on next use (cache is in-process).
4. In production, restart the Next.js server.

### Resetting

Delete the file. The loader falls back to the built-in default baked into `lib/services/ai/prompts.ts` or the registering service.

### Versioning

There is no automatic version history — just bump the `version` field each time you meaningfully change a prompt. The loader logs the version on every LLM call via the memory metadata, so you can trace a result back to the prompt that generated it. If you want proper history, keep the folder in git.

## Guards — what validators actually enforce

Many prompts claim rules ("never invent metrics", "word count 250–400"). Post-LLM validators in `lib/services/ai/validators.ts` enforce them:

- **Resume** — bullet counts (experience 3-5, projects exactly 3), metric presence, weak-verb openers, summary word count.
- **Cover letter** — word count 250–400, banned openers, company/role name in opening, metric in body. Falls back to one retry with the violation list fed to the model.
- **ATS evaluator** — every evidence quote must be a verbatim substring of the resume/JD/cover-letter. Fabricated quotes dock the metric. Red flags (employment gaps, short tenures) apply point deductions to `match_estimate`.
- **Polish section** — character count must be within 80–120% of the original. One retry if violated.
- **JD / document parsers** — warn if input appears non-English; warn if PDF extraction looks incoherent; distinguish password-protected PDFs.

## Prompt-injection safety

User-supplied content (resume text, JD text, chat messages) is passed through `escapeForPrompt()` from `lib/services/ai/escape.ts` before interpolation. This neutralizes `<system>`-style tags and common override phrases ("ignore all previous instructions") without stripping them, so the model still sees the words but can't be fooled into following them.

## Where JSON is **not** the source of truth

- **apply-agent** loads `apply_agent.json` from the Python side too. The `task_template` uses placeholders (`{job_url}`, `{resume_block}`, etc.) that the Python script fills in. Don't rename placeholders without updating `scripts/apply-agent.py`.
- **Model choice** is configured in Settings, not here — the loader controls prompt content and generation parameters, not which LLM runs them.
