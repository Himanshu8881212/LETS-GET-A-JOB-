import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security middleware — runs before every request in the Next.js App Router
 * edge. Responsibilities:
 *   1. Strip cross-origin writes (CSRF): POST/PUT/DELETE/PATCH must come
 *      from the same origin, or from a trusted tool (no Origin header).
 *   2. Rate-limit LLM-calling POSTs so a public exposure can't run up a
 *      hundred-dollar bill. Per-IP token bucket, in-memory.
 *   3. Method whitelist + Content-Type check (was already here).
 *   4. Lock down CORS to same-origin (was `*` — insecure default).
 */

// ─────────────────────────────────────────────────────────────────────────
// In-memory rate limiter. NOTE: Next.js middleware runs per-edge-instance,
// so this state is NOT shared across a clustered deploy. Fine for local
// single-user + reasonable as a first line of defense in SSR production —
// but serious rate-limiting needs Redis. Documented in production-readiness.
// ─────────────────────────────────────────────────────────────────────────

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count++
  return true
}

function clientKey(req: NextRequest): string {
  // Trust x-forwarded-for in a single-user local context; in SaaS you'd
  // want to pin this to the first hop of your proxy.
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  )
}

// Paths that call an LLM (expensive) get the stricter limit.
const EXPENSIVE_PATH_PREFIXES = [
  '/api/ai/',
  '/api/chat',           // covers /api/chat and /api/chat/stream
  '/api/agent/',
  '/api/settings/test',  // provider connectivity test also burns tokens
]

function isExpensive(pathname: string): boolean {
  return EXPENSIVE_PATH_PREFIXES.some(p => pathname === p || pathname.startsWith(p))
}

// Periodically prune stale buckets so the Map doesn't grow forever.
let lastPrune = 0
function prune() {
  const now = Date.now()
  if (now - lastPrune < 60_000) return
  lastPrune = now
  buckets.forEach((b, k) => {
    if (now >= b.resetAt) buckets.delete(k)
  })
}

// ─────────────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (!pathname.startsWith('/api/')) return response

  // Method whitelist.
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  if (!allowedMethods.includes(request.method)) {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { Allow: allowedMethods.join(', ') } },
    )
  }

  // CORS — same-origin only. Preflight short-circuits here.
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  const expectedOrigin = host ? `${request.nextUrl.protocol}//${host}` : null

  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    if (origin && expectedOrigin && origin === expectedOrigin) {
      preflight.headers.set('Access-Control-Allow-Origin', origin)
      preflight.headers.set('Access-Control-Allow-Credentials', 'true')
      preflight.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '))
      preflight.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, X-Requested-With, Authorization',
      )
    }
    return preflight
  }

  if (origin && expectedOrigin && origin !== expectedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', 'null')
  } else if (origin && expectedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // CSRF — cross-origin writes are rejected. Missing Origin is allowed
  // (curl, server-to-server, same-origin fetches without CORS preflight).
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    if (origin && expectedOrigin && origin !== expectedOrigin) {
      return NextResponse.json(
        { error: 'Cross-origin request rejected', origin, expectedOrigin },
        { status: 403 },
      )
    }
  }

  // Content-Type validation for body-bearing methods (except explicit downloads).
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type')
    const isValidContentType =
      contentType?.includes('application/json') ||
      contentType?.includes('multipart/form-data')

    if (!isValidContentType && !pathname.includes('/download')) {
      return NextResponse.json(
        {
          error: 'Invalid Content-Type',
          message: 'Content-Type must be application/json or multipart/form-data',
        },
        { status: 415 },
      )
    }
  }

  // Rate limiting. Two tiers:
  //   expensive (LLM-calling) — 20 requests / minute per IP
  //   general                 — 120 requests / minute per IP
  prune()
  const ip = clientKey(request)
  if (request.method !== 'GET') {
    const tier = isExpensive(pathname) ? 'llm' : 'general'
    const limit = tier === 'llm' ? 20 : 120
    const windowMs = 60_000
    if (!hit(`${ip}:${tier}`, limit, windowMs)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit,
          window: '1 minute',
          tier,
          retry_after_seconds: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Tier': tier,
          },
        },
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}
