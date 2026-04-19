/**
 * Loads user-editable prompt configs from `config/prompts/*.json` with a
 * hardcoded fallback. The goal is to give power users a single surface to
 * tune model behavior — system prompt, temperature, max tokens, per-mode
 * overrides — without touching code.
 *
 * If a JSON file is missing, malformed, or fails schema validation, the
 * loader logs the error once and uses the built-in default. The app never
 * hard-fails because of a bad custom prompt.
 */

import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import {
  JD_PARSER_PROMPT,
  RESUME_CLEANER_PROMPT,
  COVER_LETTER_CLEANER_PROMPT,
  ATS_EVALUATOR_PROMPT,
  FORGE_RESUME_PROMPT,
  QUILL_COVER_LETTER_PROMPT,
} from './prompts'

export type PromptId =
  | 'resume_gen'
  | 'cover_letter_gen'
  | 'ats_evaluator'
  | 'jd_parser'
  | 'resume_cleaner'
  | 'cover_letter_cleaner'
  | 'polish_section'
  | 'scout'
  | 'apply_agent'

const modelSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  // Allow 0 as a sentinel for "not applicable" (e.g. apply_agent, whose
  // token budget is owned by browser-use on the Python side).
  maxTokens: z.number().int().min(0).max(200_000).optional(),
  /** Per-mode temperature override. Keys are mode names (e.g. "tailor"). */
  temperatureByMode: z.record(z.string(), z.number().min(0).max(2)).optional(),
}).default({})

const promptConfigSchema = z.object({
  id: z.string(),
  version: z.string(),
  description: z.string().optional(),
  system: z.string().min(20),
  model: modelSchema,
  variables: z.array(z.string()).optional(),
  guards: z.record(z.string(), z.any()).optional(),
})

export type PromptConfig = z.infer<typeof promptConfigSchema>

interface Defaults {
  system: string
  temperature: number
  maxTokens: number
  temperatureByMode?: Record<string, number>
}

const DEFAULTS: Record<PromptId, Defaults> = {
  resume_gen: {
    system: FORGE_RESUME_PROMPT,
    temperature: 0.15,
    maxTokens: 10_000,
    temperatureByMode: { tailor: 0.05, optimize: 0.15, rewrite: 0.25 },
  },
  cover_letter_gen: {
    system: QUILL_COVER_LETTER_PROMPT,
    temperature: 0.1,
    maxTokens: 5_000,
  },
  ats_evaluator: {
    system: ATS_EVALUATOR_PROMPT,
    temperature: 0,
    maxTokens: 12_000,
  },
  jd_parser: {
    system: JD_PARSER_PROMPT,
    temperature: 0.1,
    maxTokens: 4_000,
  },
  resume_cleaner: {
    system: RESUME_CLEANER_PROMPT,
    temperature: 0.1,
    maxTokens: 6_000,
  },
  cover_letter_cleaner: {
    system: COVER_LETTER_CLEANER_PROMPT,
    temperature: 0.1,
    maxTokens: 6_000,
  },
  polish_section: {
    system: '__POLISH_SECTION_DEFAULT__', // set at registration time — avoids a circular import
    temperature: 0.1,
    maxTokens: 2_000,
  },
  scout: {
    system: '__SCOUT_DEFAULT__',
    temperature: 0.3,
    maxTokens: 2_500,
  },
  apply_agent: {
    system: '__APPLY_AGENT_DEFAULT__',
    temperature: 0.2,
    maxTokens: 0, // n/a — driven by browser-use
  },
}

/**
 * Lets non-prompts-centric modules register their default system prompt
 * at import time without creating a circular dep.
 */
export function registerPromptDefault(id: PromptId, system: string): void {
  DEFAULTS[id] = { ...DEFAULTS[id], system }
  // Invalidate cache for that id — the next load will re-check the JSON
  // file, and if absent will pick up the freshly-registered default.
  cache.delete(id)
}

const cache = new Map<PromptId, PromptConfig>()
const warned = new Set<string>()

function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`[prompt-loader] ${msg}`)
}

function configDir(): string {
  return path.join(process.cwd(), 'config', 'prompts')
}

function readJsonIfPresent(id: PromptId): unknown | null {
  const file = path.join(configDir(), `${id}.json`)
  if (!fs.existsSync(file)) return null
  try {
    const raw = fs.readFileSync(file, 'utf8')
    return JSON.parse(raw)
  } catch (e: any) {
    warnOnce(`parse:${id}`, `invalid JSON in ${file}: ${e?.message || e}`)
    return null
  }
}

function buildDefault(id: PromptId): PromptConfig {
  const d = DEFAULTS[id]
  return {
    id,
    version: 'built-in',
    description: `Built-in default for ${id}.`,
    system: d.system,
    model: {
      temperature: d.temperature,
      maxTokens: d.maxTokens,
      temperatureByMode: d.temperatureByMode,
    },
  }
}

export function loadPrompt(id: PromptId): PromptConfig {
  const cached = cache.get(id)
  if (cached) return cached

  const raw = readJsonIfPresent(id)
  if (!raw) {
    const def = buildDefault(id)
    cache.set(id, def)
    return def
  }

  const parsed = promptConfigSchema.safeParse(raw)
  if (!parsed.success) {
    warnOnce(
      `schema:${id}`,
      `schema validation failed for ${id}: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}. Falling back to built-in.`,
    )
    const def = buildDefault(id)
    cache.set(id, def)
    return def
  }

  cache.set(id, parsed.data)
  return parsed.data
}

/** For a mode-aware service, resolve the temperature given the chosen mode. */
export function resolveTemperature(cfg: PromptConfig, mode?: string): number {
  const byMode = cfg.model.temperatureByMode
  if (mode && byMode && typeof byMode[mode] === 'number') return byMode[mode]
  return cfg.model.temperature ?? 0.15
}

/** Test-only: clear the cache so JSON edits take effect immediately. */
export function __clearPromptCache(): void {
  cache.clear()
  warned.clear()
}
