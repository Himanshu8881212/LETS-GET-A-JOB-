# Production readiness — status and roadmap

Snapshot of where Headhunter stands as a production candidate. "Production" means different things depending on the deployment target, so the checklist is split.

Last updated: **2026-04-19**

---

## What landed in the 2026-04-19 hardening pass

| Area | Change |
|---|---|
| **TS correctness** | All pre-existing `tsc --noEmit` errors cleared (Buffer→Uint8Array, `list-models` type predicates, `personalInfo` `{}` fallbacks, pdf2json ctor). |
| **Dead code** | Removed `lib/rate-limit.ts` (unused), stray `.DS_Store`, `tsconfig.tsbuildinfo`. |
| **Rate limiting** | In-memory per-IP token bucket in `middleware.ts`. LLM-calling endpoints: 20 req/min. General API: 120 req/min. Prunes stale buckets every 60s. |
| **CSRF** | Same-origin check on POST/PUT/PATCH/DELETE. Cross-origin writes → 403. Missing-Origin requests (curl, server-to-server) still allowed. |
| **CORS** | `Access-Control-Allow-Origin: *` replaced with echo-origin (same-origin only). Preflight short-circuits properly. |
| **Secrets at rest** | `lib/crypto/secrets.ts` — AES-256-GCM + per-install master key at `data/.secrets.key` (0600 perms). `v1.` envelope for future key-rotation. API keys (`db/settings.ts`) and OAuth tokens (`oauth/storage.ts`) encrypted on write, decrypted on read. Legacy plaintext rows auto-upgrade on next write. |
| **Prompt injection** | `safeUserContent()` now wraps `input.message` in Scout (was one of the last unescaped hot paths). |
| **Input validation** | `/api/ats-evaluations` POST + PATCH now use zod schemas with proper field limits. |
| **Error observability** | New `fire-and-forget.ts` helper. Silent `.catch(() => {})` replaced with labeled `console.warn` in 6 hot-path background writes (scout × 3, resume-gen, cover-letter-gen, polish-section, ats-evaluator × 2). |
| **DB maintenance** | `runMaintenanceTasks()` on DB open: deletes activity_logs >90d, llm_calls >30d, invalidates stale `links` memory items, caps active memory at 10k with oldest-first invalidation, runs `PRAGMA optimize` + WAL checkpoint. Manual `vacuumDatabase()` export for heavy cleanup. |
| **UX polish** | 19 `alert()` calls replaced with `showToast('error', …)`. 3 ad-hoc `animate-spin` blocks replaced with `<Spinner />`. `ToastProvider` hoisted to `app/layout.tsx` so any descendant component can toast. |

---

## Deployment targets — where we stand

### 1. Local single-user tool (daily driver on your laptop)

**Status: production-ready. Green.**

Remaining quality-of-life items (low priority):
- Inline `<p>Loading…</p>` text in `SettingsPage`, `DocumentsPage`, `ATSHistoryPage` → wrap in `<Spinner />` component. Cosmetic only.
- `EmptyState` wrapping for the lineage diagrams, memory page, job analytics. Cosmetic.

### 2. Self-hosted for a technical friend or team (single-tenant, private URL)

**Status: green on essentials, with caveats.**

You can deploy it today. But before you do:
- **Browser-use / Apply agent doesn't containerize.** It needs a visible Chromium on the host. Document in the host's README that the Apply feature requires manual setup, or disable it in the build.
- **Master key is on the same disk as the DB.** If the host is compromised, so is the key. Fine for a trusted deploy; not fine for public.
- **Rate limits are per-process, in-memory.** If you run multiple replicas (don't, single-user), limits reset per restart. For a serious self-host, replace the in-memory map with a file-backed store or drop the limiter in favor of a reverse-proxy rate limit.

### 3. Public multi-user SaaS

**Status: not ready. Amber-red.**

Still open:

| Gap | Effort |
|---|---|
| **Real auth** (password / OAuth / magic link). Current session is cookie + nanoid; anyone with the cookie is "you". | Days. |
| **Multi-tenancy**. SQLite + single `users.session_id` column works for one user per install. For a SaaS, every query needs `WHERE user_id = ?` (already mostly there) + a stronger tenant boundary. | Days. |
| **Billing**. No Stripe / metered usage / per-user key bring-your-own-key enforcement. | Week. |
| **Apply agent rearchitecture**. browser-use with visible Chromium doesn't work in a container. Would need either (a) user runs agent locally via desktop client, (b) remote-browser-as-a-service (Browserbase, Browserless), or (c) convert to headless + captcha-solver. | Week+. |
| **Containerized SaaS-grade secrets**. Current master key lives on disk. SaaS needs a KMS (AWS KMS, GCP KMS, or Doppler) rotating per-tenant keys. | Days. |
| **Proper rate limiter**. Redis-backed, distributed, quota-per-user. | Day. |
| **Test suite + CI**. No unit/integration tests today. Can't deploy confidently without them. | Week. |
| **Observability**. No Sentry, OTel, structured logs, SLO dashboard. | Days. |
| **Pen test / SOC2-ish hardening**. Audit trail, data export/delete endpoints, DPA, privacy policy. | Week+. |

---

## Explicitly parked (not fixing in this session)

These showed up in the audit but were out of scope; they're ordered by priority.

1. **Resume-gen retry on validation violation.** Today, `validateResume()` attaches warnings to `_metadata.validation` but doesn't trigger a retry. Cover-letter-gen does. Symmetry would be nice.
2. **ATS keyword coverage verifier.** `hard_skills.coverage_pct` is the model's self-report. Doing a token-intersection cross-check against the JD would catch sloppy reads.
3. **JD parser — surface truncation/lang notes to callers structurally.** The service currently appends `[Parser notes]` to the output text. A structured `{ output, notes }` shape would let the UI render a clear warning.
4. **Apply agent — structured upload-failure reporting.** Today failures end up as free-text in the summary. A `upload_failures: [{path, reason}]` array would let the UI show a "these files didn't upload" strip.
5. **Real ATS parseability proxy.** M5 is all heuristics. A pre-LLM pass that runs the resume through `pdf2json` and measures text-order scramble would give the LLM structured findings instead of asking it to infer.
6. **Prompt A/B harness.** `config/prompts/experiments/` + an `X-Prompt-Version` header for running two prompt variants side-by-side on the same input.
7. **Per-user prompt overrides.** SQLite-backed overrides loaded by the existing loader.
8. **First-run onboarding panel.** New user → blank dashboard. A one-time guided setup (connect an LLM, upload existing resume, pick target role) would help.

---

## How to make a call

For each new deploy: walk through the three deployment targets above. Pick the one that matches. The gaps listed there are the work to do before shipping, in priority order.

If someone claims Headhunter is "production ready" without specifying **for which target**, they're skipping the interesting half of the question.
