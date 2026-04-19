import http from 'http'
import { AddressInfo } from 'net'

/**
 * One-shot HTTP server that listens on a specific port for a single OAuth
 * callback, resolves with the query params, then shuts itself down.
 *
 * Returns a Promise that resolves with { code, state } or rejects with an
 * error (if ?error=… was passed, or the wait times out).
 *
 * Why a temp server instead of a Next.js route? The OAuth client's
 * redirect_uri is hardcoded (by OpenAI / by the Antigravity client) to a
 * specific port + path on localhost. We don't control it — the OAuth
 * provider only accepts exactly that URL. So we stand up a listener on
 * that exact port during the flow, then shut it down.
 */
export interface CallbackResult {
  code: string
  state: string | null
}

export interface WaitOptions {
  port: number
  path: string
  /** Milliseconds before we give up. Default 5 minutes. */
  timeoutMs?: number
  /** Optional text shown on the browser page after success. */
  successHtml?: string
  /** Optional text shown on the browser page after an error. */
  errorHtml?: (err: string) => string
}

const DEFAULT_SUCCESS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Signed in</title>
<style>body{font-family:-apple-system,sans-serif;max-width:420px;margin:80px auto;padding:0 20px;text-align:center;color:#222}
h1{font-weight:600;margin-bottom:.25em}p{color:#666}</style>
</head><body>
<h1>✓ Signed in</h1>
<p>You can close this tab and return to Headhunter.</p>
<script>setTimeout(()=>window.close(),1500)</script>
</body></html>`

const defaultErrorHtml = (err: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>Sign-in failed</title>
<style>body{font-family:-apple-system,sans-serif;max-width:520px;margin:80px auto;padding:0 20px;text-align:center;color:#222}
h1{color:#b91c1c;font-weight:600;margin-bottom:.25em}pre{background:#fef2f2;border:1px solid #fecaca;padding:10px 14px;border-radius:8px;text-align:left;white-space:pre-wrap}</style>
</head><body>
<h1>Sign-in failed</h1>
<pre>${escapeHtml(err)}</pre>
<p>You can close this tab.</p>
</body></html>`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Listen once for the OAuth redirect and resolve the result. The returned
 * Promise also exposes a `cancel()` method on its resolver side for callers
 * that want to abort early — however the default timeout should handle most
 * cases.
 */
/**
 * Module-level registry of active listeners keyed by port. Starting a new
 * flow on a port that already has one → close the old one first so we don't
 * hit EADDRINUSE. This fixes the case where a user clicks Sign In, cancels,
 * and clicks Sign In again without the first attempt ever resolving.
 */
const ACTIVE_SERVERS = new Map<number, http.Server>()

function closeExistingListener(port: number): Promise<void> {
  const existing = ACTIVE_SERVERS.get(port)
  if (!existing) return Promise.resolve()
  return new Promise(resolve => {
    try {
      existing.close(() => resolve())
      // Fallback if close() hangs (e.g. keep-alive connections).
      setTimeout(() => resolve(), 1500)
    } catch {
      resolve()
    }
  })
}

export function waitForCallback(opts: WaitOptions): Promise<CallbackResult> {
  const timeout = opts.timeoutMs ?? 5 * 60 * 1000
  const successHtml = opts.successHtml ?? DEFAULT_SUCCESS_HTML
  const errorHtml = opts.errorHtml ?? defaultErrorHtml

  return new Promise(async (resolve, reject) => {
    let done = false

    // If a prior sign-in attempt is still holding the port, close it.
    await closeExistingListener(opts.port)

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', `http://localhost:${opts.port}`)
        if (url.pathname !== opts.path) {
          res.statusCode = 404
          res.end('Not Found')
          return
        }

        const err = url.searchParams.get('error')
        if (err) {
          const desc = url.searchParams.get('error_description') || err
          res.statusCode = 400
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(errorHtml(desc))
          finish(() => reject(new Error(desc)))
          return
        }

        const code = url.searchParams.get('code')
        if (!code) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(errorHtml('Missing authorization code in callback.'))
          finish(() => reject(new Error('Missing code in callback')))
          return
        }

        const state = url.searchParams.get('state')
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(successHtml)
        finish(() => resolve({ code, state }))
      } catch (e: any) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(errorHtml(e?.message || String(e)))
        finish(() => reject(e))
      }
    })

    const timer = setTimeout(() => {
      finish(() => reject(new Error('OAuth callback timed out. Please try again.')))
    }, timeout)

    function finish(action: () => void) {
      if (done) return
      done = true
      clearTimeout(timer)
      try { server.close() } catch { /* noop */ }
      ACTIVE_SERVERS.delete(opts.port)
      action()
    }

    server.once('error', (e: any) => {
      if (e && e.code === 'EADDRINUSE') {
        finish(() => reject(new Error(
          `Port ${opts.port} is already in use. Close whatever is running there (often a prior sign-in attempt) and try again.`
        )))
      } else {
        finish(() => reject(e))
      }
    })

    server.listen(opts.port, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo
      if (addr && addr.port !== opts.port) {
        finish(() => reject(new Error(
          `Could not bind to port ${opts.port} (got ${addr?.port}). OAuth requires this exact port.`
        )))
        return
      }
      ACTIVE_SERVERS.set(opts.port, server)
    })
  })
}
