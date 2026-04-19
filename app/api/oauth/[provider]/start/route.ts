import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/oauth/providers'
import { beginAuthorize } from '@/lib/oauth/flow'
import { waitForCallback } from '@/lib/oauth/callback-server'
import { completeAuthorize } from '@/lib/oauth/flow'

export const runtime = 'nodejs'
// Leave room for the user to log in — 6 minutes total.
export const maxDuration = 360

/**
 * Kick off the OAuth flow for the given provider.
 *
 * Returns the authorize URL so the client can open it in a new tab, and
 * then holds the HTTP connection open while the server-side callback
 * listener waits for the browser redirect. When the user finishes the
 * flow (or times out), we return the signed-in account info.
 *
 * This is a single round-trip from the client's perspective — fire POST,
 * open the returned URL in a new window, await the response.
 */
export async function POST(
  _request: Request,
  { params }: { params: { provider: string } }
) {
  const provider = getProvider(params.provider)
  if (!provider) {
    return NextResponse.json({ error: `Unknown OAuth provider: ${params.provider}` }, { status: 404 })
  }

  const start = beginAuthorize(provider)

  // Fire-and-wait: start the listener first, return a promise the client
  // awaits via polling or long-poll. Here we go for the simplest shape —
  // block the HTTP response until the callback lands or times out.
  const callback = waitForCallback({
    port: start.callbackPort,
    path: start.callbackPath,
  }).then(async ({ code, state }) => {
    if (state !== start.state) throw new Error('OAuth state mismatch — CSRF guard failed.')
    return completeAuthorize(state, code)
  })

  try {
    // Return the authorize URL up-front so the caller can open it, then
    // await the callback. The client knows to open the URL as soon as it
    // gets the first Set-Cookie / response body — but we can't split the
    // HTTP response in Next.js without streaming. Solution: return a
    // hand-off response that includes the URL immediately, and expose a
    // separate /wait route that the client polls.
    //
    // Pragmatic alternative (what this route does): return the URL + a
    // one-shot polling URL. The client opens the URL, then polls /status
    // until the provider shows up in the token table.
    //
    // We still register the callback listener here — it runs to completion
    // in the background as part of this lambda's tail (Node keeps it alive
    // because the Promise holds the server open).

    // Eagerly catch so we don't produce an unhandled rejection.
    callback.catch(err => {
      console.error(`OAuth ${provider.key} callback failed:`, err?.message || err)
    })

    return NextResponse.json({
      authorizeUrl: start.authorizeUrl,
      callbackPort: start.callbackPort,
      providerKey: provider.key,
      displayName: provider.displayName,
      warning: provider.warning || null,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
