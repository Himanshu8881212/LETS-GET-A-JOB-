import type { ToolDefinition } from '@/lib/llm'
import { parseJobDescriptionFromUrl, parseJobDescriptionFromText } from '@/lib/services/ai/jd-parser'
import { parseResumePdf, parseCoverLetterPdf } from '@/lib/services/ai/document-parser'
import { generateResume } from '@/lib/services/ai/resume-gen'
import { generateCoverLetter } from '@/lib/services/ai/cover-letter-gen'
import { evaluateAts } from '@/lib/services/ai/ats-evaluator'
import { addMemory, searchMemory, assertFact, factsAbout } from '@/lib/services/memory'
import { webSearchWithDedup } from './web-search'

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
      description: 'Generate a new resume tailored to a job description.',
      parameters: {
        type: 'object',
        required: ['profile_text', 'job_description'],
        properties: {
          profile_text: { type: 'string', description: 'Candidate profile (text or JSON string).' },
          job_description: { type: 'string' },
          cover_letter_text: { type: 'string' },
          generation_mode: { type: 'string', enum: ['optimize', 'rewrite', 'tailor'] },
        },
      },
    },
    handler: async (args) => generateResume(args as any),
  },

  generate_cover_letter: {
    definition: {
      name: 'generate_cover_letter',
      description: 'Generate a cover letter (250–400 words) from profile + JD.',
      parameters: {
        type: 'object',
        required: ['profile_text', 'job_description'],
        properties: {
          profile_text: { type: 'string' },
          job_description: { type: 'string' },
          cover_letter_text: { type: 'string' },
        },
      },
    },
    handler: async (args) => generateCoverLetter(args as any),
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
