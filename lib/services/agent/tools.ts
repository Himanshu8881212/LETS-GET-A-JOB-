import type { ToolDefinition } from '@/lib/llm'
import { parseJobDescriptionFromUrl, parseJobDescriptionFromText } from '@/lib/services/ai/jd-parser'
import { parseResumePdf, parseCoverLetterPdf } from '@/lib/services/ai/document-parser'
import { generateResume } from '@/lib/services/ai/resume-gen'
import { generateCoverLetter } from '@/lib/services/ai/cover-letter-gen'
import { evaluateAts } from '@/lib/services/ai/ats-evaluator'
import { addMemory, searchMemory, assertFact, factsAbout } from '@/lib/services/memory'
import { webSearchWithDedup } from './web-search'
import { getUserSession } from '@/lib/db/session'
import { gatherProfileForUser } from './profile-gather'
import { saveResumeVersion, saveCoverLetterVersion, getAllCoverLetterVersions } from '@/lib/services/document-service'

export type ToolHandler = (args: Record<string, any>) => Promise<unknown>

export interface RegisteredTool {
  definition: ToolDefinition
  handler: ToolHandler
}

export const TOOL_REGISTRY: Record<string, RegisteredTool> = {
  parse_jd: {
    definition: {
      name: 'parse_jd',
      description: 'Parse a job description. Provide either url OR text — url triggers a 3-tier fetch (plain → Jina Reader → Puppeteer) and then LLM cleanup.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Public URL of the job posting.' },
          text: { type: 'string', description: 'Raw pasted JD text.' },
        },
      },
    },
    handler: async ({ url, text }) => {
      if (url) return { job_description: await parseJobDescriptionFromUrl(url) }
      if (text) return { job_description: await parseJobDescriptionFromText(text) }
      throw new Error('parse_jd: provide url or text')
    },
  },

  parse_resume: {
    definition: {
      name: 'parse_resume',
      description: "Extract a resume from a base64-encoded PDF.",
      parameters: {
        type: 'object',
        required: ['pdfBase64'],
        properties: {
          pdfBase64: { type: 'string', description: 'Base64 string of the PDF file.' },
          fileName: { type: 'string' },
        },
      },
    },
    handler: async ({ pdfBase64, fileName }) => parseResumePdf({ pdfBase64, fileName }),
  },

  parse_cover_letter: {
    definition: {
      name: 'parse_cover_letter',
      description: 'Extract a cover letter from a base64-encoded PDF.',
      parameters: {
        type: 'object',
        required: ['pdfBase64'],
        properties: {
          pdfBase64: { type: 'string' },
          fileName: { type: 'string' },
        },
      },
    },
    handler: async ({ pdfBase64, fileName }) => parseCoverLetterPdf({ pdfBase64, fileName }),
  },

  generate_resume: {
    definition: {
      name: 'generate_resume',
      description:
        'Generate a resume purely from what we already know about the user — their memory facts and their most recent saved resume. No job description involved. Saves the result as a new version in their Resumes library. Use this whenever the user asks "make me a resume", "draft my resume", "generate a resume from what you know about me", or similar.',
      parameters: {
        type: 'object',
        properties: {
          version_name: {
            type: 'string',
            description: 'Optional name for the saved version. Defaults to "Scout draft — personal resume — {date}".',
          },
        },
      },
    },
    handler: async (args) => {
      const userId = await getUserSession()
      const profile = gatherProfileForUser(userId)
      if (profile.isEmpty) {
        return {
          ok: false,
          error: 'no_profile',
          message: profile.reason,
        }
      }

      // Pure profile-based generation — no tailoring. Feed Forge a minimal
      // "general-purpose resume" placeholder so its JD-driven emphasis
      // machinery stays quiet, and it reflects the candidate's actual
      // strengths rather than targeting a specific role.
      const placeholderJd =
        'GENERAL-PURPOSE RESUME. The user is asking for a personal resume based on who they are — not tailored to any specific role. Do NOT invent keywords to match a target job. Instead, produce a balanced resume that faithfully represents the candidate\'s actual background, skills, and achievements as provided in resume_data. Emphasize genuine strengths and recent impact.'

      let generated: any
      try {
        generated = await generateResume({
          job_description: placeholderJd,
          profile_text: profile.profile_text,
          generation_mode: 'tailor',
        })
      } catch (e: any) {
        return { ok: false, error: 'generation_failed', message: e?.message || String(e) }
      }

      const date = new Date().toISOString().slice(0, 10)
      const versionName = args.version_name || `Scout draft — personal resume — ${date}`

      let savedId: number | undefined
      try {
        const saved = await saveResumeVersion(userId, versionName, generated, {
          description: 'Generated by Scout from memory + saved profile (no JD).',
        })
        savedId = saved.id
      } catch (e: any) {
        return {
          ok: true,
          saved: false,
          error: 'save_failed',
          message: `Resume generated but couldn't be saved: ${e?.message || e}. Returning the draft inline.`,
          resume: generated,
        }
      }

      const validationWarnings: string[] =
        (generated?._metadata?.validation?.violations || [])
          .filter((v: any) => v.severity === 'warn' || v.severity === 'error')
          .slice(0, 5)
          .map((v: any) => v.message)

      return {
        ok: true,
        saved: true,
        version_id: savedId,
        version_name: versionName,
        sources_used: profile.sources,
        validation_warnings: validationWarnings,
        open_url: savedId ? `/resumes/${savedId}` : '/',
        user_message_hint:
          `I've drafted a resume from what I know about you and saved it as "${versionName}" in your Resumes library. Tell the user they can open it to review and edit.`,
      }
    },
  },

  generate_cover_letter: {
    definition: {
      name: 'generate_cover_letter',
      description:
        'Generate a cover letter (250–400 words) purely from what we already know about the user — their memory facts and their most recent saved resume. No job description involved. Saves the result in their Cover Letters library. Use this whenever the user asks "write me a cover letter", "draft my cover letter", "make a cover letter from what you know about me", or similar.',
      parameters: {
        type: 'object',
        properties: {
          version_name: { type: 'string' },
        },
      },
    },
    handler: async (args) => {
      const userId = await getUserSession()
      const profile = gatherProfileForUser(userId)
      if (profile.isEmpty) {
        return { ok: false, error: 'no_profile', message: profile.reason }
      }

      // Latest saved cover letter (if any) seeds the style for the generator.
      let lastCLText = ''
      try {
        const cls = getAllCoverLetterVersions(userId)
        if (cls.length > 0) {
          const d: any = JSON.parse(cls[0].data_json)
          lastCLText = [
            d?.openingParagraph,
            ...(Array.isArray(d?.bodyParagraphs) ? d.bodyParagraphs : []),
            d?.closingParagraph,
          ]
            .filter(Boolean)
            .join('\n\n')
        }
      } catch { /* noop */ }

      // Pure profile-based: no company research, no JD-matching — let the
      // generator produce a letter that represents the candidate's voice
      // and strengths without inventing a target role.
      const placeholderJd =
        'GENERAL-PURPOSE COVER LETTER. The user is asking for a personal cover letter based on who they are — not tailored to any specific company or role. Do NOT fabricate company-specific references or a named hiring manager; address the letter to "Hiring Manager" and speak in general terms about what the candidate brings. Lead with two quantified accomplishments from resume_data. Keep word count 250–400. Closing: confident, brief, invites conversation — no specific company fact.'

      let generated: any
      try {
        generated = await generateCoverLetter({
          job_description: placeholderJd,
          profile_text: profile.profile_text,
          cover_letter_text: lastCLText || undefined,
        })
      } catch (e: any) {
        return { ok: false, error: 'generation_failed', message: e?.message || String(e) }
      }

      const date = new Date().toISOString().slice(0, 10)
      const versionName = args.version_name || `Scout draft — personal cover letter — ${date}`

      let savedId: number | undefined
      try {
        const saved = await saveCoverLetterVersion(userId, versionName, generated, {
          description: 'Generated by Scout from memory + saved profile (no JD).',
        })
        savedId = saved.id
      } catch (e: any) {
        return {
          ok: true,
          saved: false,
          error: 'save_failed',
          message: `Cover letter generated but couldn't be saved: ${e?.message || e}. Returning the draft inline.`,
          cover_letter: generated,
        }
      }

      const validationWarnings: string[] =
        (generated?._metadata?.validation?.violations || [])
          .filter((v: any) => v.severity === 'warn' || v.severity === 'error')
          .slice(0, 5)
          .map((v: any) => v.message)

      return {
        ok: true,
        saved: true,
        version_id: savedId,
        version_name: versionName,
        word_count: generated?._metadata?.word_count ?? generated?._metadata?.validation?.word_count,
        sources_used: profile.sources,
        validation_warnings: validationWarnings,
        open_url: savedId ? `/cover-letters/${savedId}` : '/',
        user_message_hint:
          `I've drafted a cover letter from what I know about you and saved it as "${versionName}" in your Cover Letters library. Tell the user they can open it to review.`,
      }
    },
  },

  evaluate_ats: {
    definition: {
      name: 'evaluate_ats',
      description: 'Run the 10-metric ATS rubric on a resume (and optional cover letter) against a JD.',
      parameters: {
        type: 'object',
        required: ['resume_text', 'job_description'],
        properties: {
          resume_text: { type: 'string' },
          cover_letter_text: { type: 'string' },
          job_description: { type: 'string' },
        },
      },
    },
    handler: async (args) => evaluateAts(args as any),
  },

  search_memory: {
    definition: {
      name: 'search_memory',
      description: 'Search the agent memory for relevant prior context. Returns top-k items ranked by semantic similarity.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          wings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional filter: profile, resume, cover_letter, ats, chat, job, style.',
          },
          k: { type: 'number', description: 'Max hits (default 5).' },
        },
      },
    },
    handler: async ({ query, wings, k }) => {
      const hits = await searchMemory({ query, wings, k, currentOnly: true, outcomeWeight: 0.2 })
      return {
        query,
        wings: wings || null,
        count: hits.length,
        hits: hits.map(h => ({
          id: h.id,
          wing: h.wing,
          drawer: h.drawer,
          similarity: Number(h.similarity.toFixed(3)),
          outcome_score: h.outcomeScore,
          content: h.content,
        })),
        note: 'These came from your memory palace. Treat as reference only; match against the current task before using.',
      }
    },
  },

  save_memory: {
    definition: {
      name: 'save_memory',
      description: 'Record a durable memory item. Use this to remember things that should help future sessions (preferences, winning bullets, feedback).',
      parameters: {
        type: 'object',
        required: ['wing', 'content'],
        properties: {
          wing: { type: 'string', description: 'profile | resume | cover_letter | ats | chat | job | style' },
          room: { type: 'string' },
          drawer: { type: 'string' },
          content: { type: 'string', description: 'Verbatim content — do not summarize.' },
          outcomeScore: { type: 'number', description: 'Optional quality score 0-10. Higher = more useful.' },
        },
      },
    },
    handler: async (args) => {
      const item = await addMemory({
        wing: args.wing,
        room: args.room,
        drawer: args.drawer,
        content: args.content,
        outcomeScore: args.outcomeScore,
      })
      return { id: item.id }
    },
  },

  assert_fact: {
    definition: {
      name: 'assert_fact',
      description: 'Store a durable fact about a subject (usually "user"). Supersedes any prior fact with the same subject+predicate.',
      parameters: {
        type: 'object',
        required: ['subject', 'predicate', 'object'],
        properties: {
          subject: { type: 'string', description: 'Usually "user".' },
          predicate: { type: 'string', description: 'e.g. "target_role", "years_experience", "relocation_ok".' },
          object: { type: 'string', description: 'The value.' },
          confidence: { type: 'number' },
        },
      },
    },
    handler: async (args) => {
      // Agent assertions come from conversational context → source='chat'.
      // That outranks profile-derived extractions on conflict.
      const f = assertFact(args.subject, args.predicate, args.object, {
        confidence: args.confidence,
        source: 'chat',
      })
      return { id: f.id }
    },
  },

  facts_about: {
    definition: {
      name: 'facts_about',
      description: 'Retrieve all current facts about a subject.',
      parameters: {
        type: 'object',
        required: ['subject'],
        properties: { subject: { type: 'string' } },
      },
    },
    handler: async ({ subject }) => ({ facts: factsAbout(subject) }),
  },

  web_search: {
    definition: {
      name: 'web_search',
      description:
        'Search the web for up-to-date information. Best for live job postings, news, recent articles. Auto-deduplicates against URLs already surfaced to this user (calling again returns NEW results). For job searches, ALWAYS pass jobPortalsOnly:true so results are scoped to the user\'s configured portals.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description:
              'Plain-language search. Include language/location/role requirements directly in the query for best results (e.g. "data analyst Berlin English-only remote").',
          },
          jobPortalsOnly: {
            type: 'boolean',
            description:
              'Set to true for job searches. Scopes results to the user\'s configured job portal list (LinkedIn, Indeed, Wellfound, Arbeitnow, Otta, etc.). Do NOT also pass site or sites when this is true.',
          },
          sites: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Custom list of domains to restrict the search to (passed to Tavily as include_domains). Use this for non-job searches where you want to focus on specific sites.',
          },
          site: {
            type: 'string',
            description: 'Single-domain filter (legacy). Prefer `sites` or `jobPortalsOnly`.',
          },
          timeRange: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year'],
            description:
              'Freshness filter. "day" = last 24h, "week" = last 7d, "month" = last 30d. Use this instead of maxAgeDays when possible.',
          },
          maxAgeDays: {
            type: 'number',
            description: 'Legacy freshness in days. Prefer timeRange.',
          },
          country: {
            type: 'string',
            description: 'Boost results from a specific country (e.g. "germany", "united states"). Tavily only.',
          },
          limit: { type: 'number', description: 'Max results (default 6, cap 20).' },
        },
      },
    },
    handler: async (args) => {
      const out = await webSearchWithDedup({
        query: args.query,
        site: args.site,
        sites: Array.isArray(args.sites) ? args.sites : undefined,
        jobPortalsOnly: !!args.jobPortalsOnly,
        timeRange: args.timeRange,
        maxAgeDays: args.maxAgeDays,
        country: args.country,
        limit: args.limit,
      })
      return {
        query: args.query,
        backend: out.backend,
        sites_used: out.sitesUsed,
        count: out.results.length,
        skipped_duplicates: out.skippedDuplicates,
        results: out.results,
        note:
          out.skippedDuplicates > 0
            ? `${out.skippedDuplicates} result(s) were hidden because they've been shown before.`
            : undefined,
        setup_hint: out.setupHint,
      }
    },
  },
}

export function listToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY).map(t => t.definition)
}

export function getToolHandler(name: string): ToolHandler | undefined {
  return TOOL_REGISTRY[name]?.handler
}
