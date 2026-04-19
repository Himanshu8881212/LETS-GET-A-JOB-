/**
 * Small helper for background writes (memory persistence, fact extraction,
 * telemetry) that we don't want to fail the user-facing response.
 *
 * Usage: `fireAndForget('addMemory/resume', addMemory({...}))`.
 *
 * The difference from a bare `.catch(() => {})`:
 *   - Errors ARE logged (with a label) via console.warn, so debugging isn't
 *     a dead end.
 *   - The function signature matches what callers already do — no await,
 *     no return value.
 *
 * Only use for genuinely non-critical operations. Security-sensitive writes
 * (OAuth token persist, settings save, auth checks) should NOT be
 * fire-and-forget — let them throw and surface to the caller.
 */
export function fireAndForget<T>(label: string, p: Promise<T>): void {
  p.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    // Avoid spamming the console for the same error — keep it to one line.
    console.warn(`[bg] ${label} failed: ${msg}`)
  })
}
