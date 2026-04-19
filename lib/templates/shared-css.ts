/**
 * Shared typography + page tokens for resume and cover letter PDFs.
 *
 * Design rules:
 * - Arial-first sans stack (universally available in Chromium)
 * - 10.5pt body, 0.55in margins, ink-only color palette
 * - Section headings: 10.5pt bold UPPERCASE with 0.8pt tracking + thin rule
 * - No decorative fonts, no multi-column layout, no tables, no color accents
 * - Dense vertical rhythm — intended for single-page output
 */

/**
 * Pull a handle out of whatever the user typed into a LinkedIn / GitHub field.
 * Accepts:
 *   "johndoe"
 *   "@johndoe"
 *   "github.com/johndoe"
 *   "https://www.github.com/johndoe"
 *   "https://www.linkedin.com/in/johndoe/"
 *   "linkedin.com/in/johndoe"
 */
export function extractHandle(raw: string, network: 'linkedin' | 'github'): string {
  if (!raw) return ''
  let clean = raw.trim()
  clean = clean.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
  if (network === 'linkedin') {
    const m = clean.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i)
    if (m) return decodeURIComponent(m[1])
    // User typed just "johndoe" or "in/johndoe"
    return clean.replace(/^in\//i, '').replace(/^@/, '')
  }
  if (network === 'github') {
    const m = clean.match(/github\.com\/([^/?#]+)/i)
    if (m) return decodeURIComponent(m[1])
    return clean.replace(/^@/, '')
  }
  return clean
}

export function profileUrl(handleOrRaw: string, network: 'linkedin' | 'github'): string {
  const handle = extractHandle(handleOrRaw, network).replace(/^@/, '')
  if (!handle) return ''
  return network === 'linkedin'
    ? `https://linkedin.com/in/${handle}`
    : `https://github.com/${handle}`
}

export const SHARED_TOKENS = {
  fontStack: `Arial, Helvetica, 'Helvetica Neue', sans-serif`,
  bodySize: '10.5pt',
  metaSize: '9.75pt',
  h2Size: '10.5pt',
  nameResume: '20pt',
  nameCoverLetter: '13pt',
  lineHeight: '1.35',
  ink: '#0f172a',
  meta: '#475569',
  muted: '#64748b',
  rule: '#cbd5e1',
  pageMargin: '0.55in',
}

export const SHARED_BASE_CSS = `
  @page { size: Letter; margin: ${SHARED_TOKENS.pageMargin}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${SHARED_TOKENS.fontStack};
    font-size: ${SHARED_TOKENS.bodySize};
    line-height: ${SHARED_TOKENS.lineHeight};
    color: ${SHARED_TOKENS.ink};
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  p { margin: 0; }
  h1, h2, h3 { margin: 0; color: ${SHARED_TOKENS.ink}; }
  h2 {
    font-family: ${SHARED_TOKENS.fontStack};
    font-size: ${SHARED_TOKENS.h2Size};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8pt;
    margin: 8pt 0 3pt;
    padding-bottom: 2pt;
    border-bottom: 0.5pt solid ${SHARED_TOKENS.rule};
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  a.link-accent {
    color: ${SHARED_TOKENS.ink};
    text-decoration: none;
    border-bottom: 0.4pt solid ${SHARED_TOKENS.rule};
  }
`
