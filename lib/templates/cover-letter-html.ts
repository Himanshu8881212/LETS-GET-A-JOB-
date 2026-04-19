import { SHARED_BASE_CSS, SHARED_TOKENS, extractHandle, profileUrl } from './shared-css'

function escape(s: unknown): string {
  const str = String(s ?? '')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface PersonalInfo {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  linkedin?: string
  address?: string
}

interface Recipient {
  company?: string
  role?: string
  hiringManager?: string
  address?: string
  city?: string
}

export interface CoverLetterInput {
  personalInfo?: PersonalInfo
  recipient?: Recipient
  content?: {
    opening?: string
    bodyParagraphs?: string[]
    closing?: string
  }
}

const COVER_LETTER_CSS = `
  ${SHARED_BASE_CSS}
  body { line-height: 1.4; font-size: 11pt; }
  header.sender {
    padding-bottom: 5pt;
    border-bottom: 0.75pt solid ${SHARED_TOKENS.ink};
    margin-bottom: 10pt;
  }
  header.sender .name {
    font-size: ${SHARED_TOKENS.nameCoverLetter};
    font-weight: 700;
    letter-spacing: 0.5pt;
    text-transform: uppercase;
    margin: 0 0 2pt;
  }
  header.sender .contact {
    margin: 0;
    font-size: ${SHARED_TOKENS.metaSize};
    color: ${SHARED_TOKENS.meta};
  }
  .date { margin: 0 0 10pt; font-size: 11pt; }
  .recipient { margin: 0 0 10pt; font-size: 11pt; line-height: 1.3; }
  .recipient strong { display: block; font-weight: 700; }
  .recipient .line { display: block; }
  .salutation { margin: 0 0 8pt; }
  .body-copy p { margin: 0 0 8pt; }
  .body-copy p:last-child { margin-bottom: 0; }
  .sign-off { margin-top: 10pt; }
  .sign-off .name { margin-top: 18pt; font-weight: 700; }
`

function contactLine(p: PersonalInfo): string {
  const parts: string[] = []
  if (p.email?.trim()) {
    const e = escape(p.email.trim())
    parts.push(`<a href="mailto:${e}">${e}</a>`)
  }
  if (p.phone?.trim()) {
    const t = p.phone.trim()
    parts.push(`<a href="tel:${escape(t.replace(/[^\d+]/g, ''))}">${escape(t)}</a>`)
  }
  if (p.linkedin?.trim()) {
    const h = extractHandle(p.linkedin, 'linkedin')
    const url = profileUrl(h, 'linkedin')
    parts.push(h && url ? `linkedin: <a class="link-accent" href="${url}">${escape(h)}</a>` : escape(p.linkedin.trim()))
  }
  if (p.address?.trim()) parts.push(escape(p.address.trim()))
  return parts.join('  \u2022  ')
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function renderCoverLetterHtml(data: CoverLetterInput): string {
  const p = data.personalInfo || {}
  const r = data.recipient || {}
  const c = data.content || {}

  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Your Name'
  const manager = (r.hiringManager || '').trim() || 'Hiring Manager'
  const salutation = `Dear ${escape(manager)},`

  const bodyParas = (c.bodyParagraphs || []).filter(b => b?.trim())
  const paragraphs = [c.opening, ...bodyParas, c.closing].filter((v): v is string => !!v?.trim())

  const recipientLines: string[] = []
  if (r.hiringManager) recipientLines.push(`<strong>${escape(manager)}</strong>`)
  if (r.role) recipientLines.push(`<span class="line">${escape(r.role)}</span>`)
  if (r.company) recipientLines.push(`<span class="line">${escape(r.company)}</span>`)
  if (r.address) recipientLines.push(`<span class="line">${escape(r.address)}</span>`)
  if (r.city) recipientLines.push(`<span class="line">${escape(r.city)}</span>`)
  const recipientBlock = recipientLines.length ? `<div class="recipient">${recipientLines.join('')}</div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escape(fullName)} — Cover Letter</title>
<style>${COVER_LETTER_CSS}</style>
</head>
<body>
<header class="sender">
  <p class="name">${escape(fullName)}</p>
  <p class="contact">${contactLine(p)}</p>
</header>
<p class="date">${formatDate()}</p>
${recipientBlock}
<p class="salutation">${salutation}</p>
<div class="body-copy">
${paragraphs.map(para => `<p>${escape(para.trim())}</p>`).join('\n')}
</div>
<div class="sign-off">
  <p>Sincerely,</p>
  <p class="name">${escape(fullName)}</p>
</div>
</body>
</html>`
}
