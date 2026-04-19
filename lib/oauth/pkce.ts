import crypto from 'crypto'

/** Random URL-safe base64 string, 43 chars for a 32-byte buffer. */
export function randomUrlSafe(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

/** RFC 7636 S256 code challenge = BASE64URL(SHA256(code_verifier)). */
export function s256Challenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export interface PkcePair {
  verifier: string
  challenge: string
}

export function generatePkcePair(): PkcePair {
  const verifier = randomUrlSafe(32)
  return { verifier, challenge: s256Challenge(verifier) }
}
