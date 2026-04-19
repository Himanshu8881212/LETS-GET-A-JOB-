# Headhunter

A local-first job-search co-pilot. One LLM drives resume and cover-letter generation, ATS evaluation, JD parsing, a chat assistant (Scout), and a visible browser agent that fills out online applications. A shared "memory palace" lets every feature benefit from what the others have already learned about you.

> Repo name is `LETS-GET-A-JOB-`. The app itself is branded **Headhunter**.

---

## What it does

- **Resume & cover-letter builder** — section-by-section, with per-section magic-wand polish, version history, and DOCX/PDF export.
- **ATS evaluator** — scores a resume against a job description, returns targeted suggestions, and feeds high-scoring phrasing back into memory.
- **JD parsing & URL fetch** — paste a job URL or description, get structured fields (company, role, requirements).
- **Scout chat** — conversational assistant over your own documents and memory, with web search (Tavily) and document upload.
- **Apply agent** — drives a visible Chromium via [browser-use](https://github.com/browser-use/browser-use) to fill applications, answer questionnaires, and upload your resume/cover letter. **It never submits** — it stops at the review step so you can verify.
- **Memory palace** — verbatim entries + Float32 embeddings stored in SQLite. Facts are source-ranked (manual > chat > profile > inferred). Every feature reads and writes the same memory so the system learns your voice over time.
- **Job tracker & history** — kanban board, ATS history, resume/cover-letter lineage diagrams, activity telemetry.

---

## Quick start (local)

### Prerequisites

- Node.js 20+
- Python 3.11+ (only if you want to use the Apply agent)
- One of:
  - An OpenAI account (for OAuth sign-in — cheapest path), **or**
  - An API key from OpenRouter, Mistral, or a local Ollama / LM Studio instance.

### Install & run

```bash
npm install
cp .env.example .env        # or configure in-app via /settings
npm run dev                  # http://localhost:3000
```

On first load, open **Settings** and either:

1. **Sign in with OpenAI (Codex OAuth)** — no API keys, uses your subscription, or
2. Paste an **API key** for OpenRouter / Mistral / Ollama / LM Studio.

For Scout web search, add a **Tavily API key** in Settings.

### Apply agent (optional)

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Then click **Apply** on any tracked job. A Chromium window opens and drives the form. You review and submit.

---

## LLM providers

The app abstracts over several providers through a single interface (`lib/llm/`):

| Provider | Auth | Notes |
|---|---|---|
| OpenAI (Codex) | OAuth PKCE | Uses your OpenAI subscription. Recommended. |
| OpenRouter | API key | Access to hundreds of models under one key. |
| Mistral | API key | `mistral-medium-latest` etc. |
| Ollama | none (local) | Point `base_url` at `http://localhost:11434/v1`. |
| LM Studio | none (local) | Point `base_url` at `http://localhost:1234/v1`. |

You can override the provider per feature (ATS eval, Scout, generation, etc.) from Settings or via `LLM_*` env vars — see [`.env.example`](.env.example) for the full matrix.

---

## Architecture at a glance

```
  UI (Next.js 14, App Router)
       │
       ▼
  app/api/*    ──▶  lib/services/ai/*         (single-shot services)
                      ├── resume-gen
                      ├── cover-letter-gen
                      ├── ats-evaluator
                      ├── jd-parser
                      ├── polish-section
                      └── scout (tool-use agent)
                           │
                           ▼
                      lib/services/agent/     (loop + 11 tools + web search)
                           │
                           ▼
                      lib/services/memory/    (palace: store / search / facts / extract)
                           │
                           ▼
                      SQLite (better-sqlite3)
```

- **Single model, many jobs.** All services share one configured LLM and inject a scoped XML context (`<user_facts>`, `<reference_material>`, `<workspace_summary>`, `<reference_policy>`) so the model gets useful signal without drifting into unrelated memories.
- **Shared memory.** Every feature writes notable outputs back into the palace; future calls retrieve them by semantic similarity. The outcome loop boosts style entries that appear in resumes scoring ≥ 75 on ATS.
- **Hallucination guards.** Fact extractor uses an `ALLOWED_PREDICATES` whitelist and rejects hedged claims. Polish prompts forbid copying facts from reference material.

---

## Project layout

```
app/
  api/           REST routes (ai/, agent/, chat/, oauth/, memory/, ...)
  page.tsx       shell
components/      resume/cover-letter builders, Scout chat, settings, ...
lib/
  llm/           provider abstraction (OAuth, OpenAI-compatible, Anthropic, Google)
  services/
    ai/          per-feature LLM services
    agent/       tool-use loop + web search + apply driver
    memory/      palace (store, search, embed, extract, facts, reindex)
  oauth/         PKCE flow + token store
  db/            SQLite schema & migrations
scripts/
  apply-agent.py browser-use driver (Python)
  smoke-test.mjs end-to-end smoke test
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build && npm start` | Production build |
| `npm run smoke` | End-to-end smoke test (gen → ATS → tailor → parse → scout) |
| `npm run test:run` | Full integration run |

---

## Docker

A `docker-compose.yml` is included for running the app in a container. The Apply agent is not containerized — it expects a visible browser on the host.

```bash
docker compose up --build
```

---

## Data & privacy

- All state — documents, memory, settings, OAuth tokens — lives in a local SQLite database (`data/app.db`). Nothing leaves your machine except the LLM calls you make and the optional Tavily web searches.
- Gitignored: `.env*`, `data/`, `*.db`, Python venv, Claude local settings.

---

## Status

Active development. Expect rough edges — especially in the Apply agent, which depends on the target site's DOM stability. Contributions and bug reports welcome.

— Himanshu
