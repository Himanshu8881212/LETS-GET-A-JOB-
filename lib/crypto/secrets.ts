/**
 * Local-first secrets-at-rest encryption.
 *
 * Why: the app stores API keys and OAuth access/refresh tokens in SQLite.
 * Previously plaintext — anyone with the `data/app.db` file could read them.
 * This module wraps AES-256-GCM around those values, keyed off a per-install
 * master key that lives in `data/.secrets.key` with 0600 perms.
 *
 * Format (base64): `v1.` prefix + iv(12) + authTag(16) + ciphertext.
 *   The `v1.` prefix makes detection trivial so we can transparently upgrade
 *   plaintext rows on first read (see `maybeDecrypt`) — important for
 *   migrating existing databases without forcing the user to re-enter keys.
 *
 * Caveats:
 *   - The master key lives on the same disk as the DB, so this is defense
 *     against casual DB-dump leaks, NOT against an attacker with root.
 *     For stronger at-rest protection, back this with an OS keychain or a
 *     user-supplied passphrase.
 *   - Do NOT encrypt anything you need to search on — only single-row reads.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
const PREFIX = 'v1.'

function keyPath(): string {
  const dir = path.join(process.cwd(), 'data')
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  return path.join(dir, '.secrets.key')
}

let cachedKey: Buffer | null = null

function loadOrGenerateKey(): Buffer {
  if (cachedKey) return cachedKey
  const p = keyPath()
  if (fs.existsSync(p)) {
    const k = fs.readFileSync(p)
    if (k.length !== 32) {
      throw new Error(
        `Master key at ${p} is ${k.length} bytes; expected 32. ` +
          'Refusing to continue. Back it up, delete it, and re-authenticate to rotate.',
      )
    }
    cachedKey = k
    return k
  }
  const k = crypto.randomBytes(32)
  fs.writeFileSync(p, k, { mode: 0o600 })
  try {
    fs.chmodSync(p, 0o600)
  } catch {
    /* best-effort on platforms without POSIX perms */
  }
  cachedKey = k
  return k
}

/**
 * Encrypt a plaintext string. Returns a base64 blob prefixed with `v1.`.
 * Empty strings pass through unchanged — no point encrypting nothing, and it
 * lets callers use the same getter without null-checks.
 */
export function encryptSecret(plain: string): string {
  if (!plain) return plain
  const key = loadOrGenerateKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64')
}

/**
 * Decrypt a value produced by `encryptSecret`. Throws if auth-tag fails.
 * If the value is not in the `v1.` envelope, it's returned unchanged —
 * this supports transparent upgrade of pre-encryption rows.
 */
export function decryptSecret(value: string): string {
  if (!value) return value
  if (!value.startsWith(PREFIX)) return value
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64')
  if (raw.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error('encrypted secret is truncated')
  }
  const key = loadOrGenerateKey()
  const iv = raw.subarray(0, IV_BYTES)
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ct = raw.subarray(IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

/** True if `value` is an encrypted blob produced by this module. */
export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX)
}

/**
 * Accept either a plaintext (legacy row) or a ciphertext and always return
 * plaintext. Used by readers during the transparent-migration window.
 */
export function maybeDecrypt(value: string | null | undefined): string {
  if (!value) return ''
  if (!isEncrypted(value)) return value
  try {
    return decryptSecret(value)
  } catch (e: any) {
    console.warn('[secrets] decrypt failed (corrupted key or payload):', e?.message || e)
    return ''
  }
}
