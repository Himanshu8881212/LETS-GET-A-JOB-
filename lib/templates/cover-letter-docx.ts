import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import { extractHandle, profileUrl } from './shared-css'

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

const INK = '0F172A'
const META = '475569'

const pt = (n: number) => n * 2
const inch = (n: number) => Math.round(n * 1440)

const BODY_FONT = 'Arial'
const BODY_SIZE = pt(11)
const META_SIZE = pt(9.75)
const NAME_SIZE = pt(13)

function run(text: string, opts: Partial<{ bold: boolean; color: string; size: number }> = {}): TextRun {
  return new TextRun({
    text,
    font: BODY_FONT,
    size: opts.size ?? BODY_SIZE,
    color: opts.color ?? INK,
    bold: opts.bold,
  })
}

function para(text: string, after = pt(8)): Paragraph {
  return new Paragraph({ spacing: { after, line: 300 }, children: [run(text)] })
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function metaTextRun(text: string): TextRun {
  return new TextRun({ text, font: BODY_FONT, size: META_SIZE, color: META })
}

function contactChildren(p: PersonalInfo): (TextRun | ExternalHyperlink)[] {
  const out: (TextRun | ExternalHyperlink)[] = []
  const sep = '  \u2022  '
  const pushWithSep = (node: TextRun | ExternalHyperlink) => {
    if (out.length > 0) out.push(metaTextRun(sep))
    out.push(node)
  }
  if (p.email?.trim()) {
    pushWithSep(
      new ExternalHyperlink({
        link: `mailto:${p.email.trim()}`,
        children: [new TextRun({ text: p.email.trim(), font: BODY_FONT, size: META_SIZE, color: META, underline: {} })],
      })
    )
  }
  if (p.phone?.trim()) pushWithSep(metaTextRun(p.phone.trim()))
  if (p.linkedin?.trim()) {
    const h = extractHandle(p.linkedin, 'linkedin')
    const url = profileUrl(h, 'linkedin')
    if (h && url) {
      if (out.length > 0) out.push(metaTextRun(sep))
      out.push(metaTextRun('linkedin: '))
      out.push(
        new ExternalHyperlink({
          link: url,
          children: [new TextRun({ text: h, font: BODY_FONT, size: META_SIZE, color: META, underline: {} })],
        })
      )
    } else {
      pushWithSep(metaTextRun(p.linkedin.trim()))
    }
  }
  if (p.address?.trim()) pushWithSep(metaTextRun(p.address.trim()))
  return out
}

export async function renderCoverLetterDocx(data: CoverLetterInput): Promise<Buffer> {
  const p = data.personalInfo || {}
  const r = data.recipient || {}
  const c = data.content || {}

  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Your Name'
  const manager = (r.hiringManager || '').trim() || 'Hiring Manager'
  const body = (c.bodyParagraphs || []).filter(b => b?.trim())
  const paragraphs = [c.opening, ...body, c.closing].filter((v): v is string => !!v?.trim())

  const paras: Paragraph[] = []

  // Sender
  paras.push(
    new Paragraph({
      spacing: { after: pt(1), line: 260 },
      children: [
        new TextRun({
          text: fullName,
          font: BODY_FONT,
          size: NAME_SIZE,
          bold: true,
          color: INK,
          allCaps: true,
          characterSpacing: 10,
        }),
      ],
    })
  )
  paras.push(
    new Paragraph({
      spacing: { after: pt(4), line: 260 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 2 } },
      children: contactChildren(p),
    })
  )

  // Date
  paras.push(para(formatDate(), pt(8)))

  // Recipient block
  if (r.hiringManager) paras.push(new Paragraph({ spacing: { after: 0, line: 260 }, children: [run(manager, { bold: true })] }))
  if (r.role) paras.push(new Paragraph({ spacing: { after: 0, line: 260 }, children: [run(r.role)] }))
  if (r.company) paras.push(new Paragraph({ spacing: { after: 0, line: 260 }, children: [run(r.company)] }))
  if (r.address) paras.push(new Paragraph({ spacing: { after: 0, line: 260 }, children: [run(r.address)] }))
  if (r.city) paras.push(new Paragraph({ spacing: { after: pt(4), line: 260 }, children: [run(r.city)] }))

  // Salutation
  paras.push(para(`Dear ${manager},`, pt(6)))

  // Body paragraphs
  for (const text of paragraphs) paras.push(para(text.trim(), pt(6)))

  // Sign-off
  paras.push(para('Sincerely,', pt(10)))
  paras.push(
    new Paragraph({
      spacing: { before: pt(10), line: 260 },
      children: [run(fullName, { bold: true })],
    })
  )

  const doc = new Document({
    creator: 'Headhunter',
    title: `${fullName} — Cover Letter`,
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE, color: INK },
          paragraph: { spacing: { line: 300 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: inch(0.55), right: inch(0.55), bottom: inch(0.55), left: inch(0.55) },
            size: { width: inch(8.5), height: inch(11) },
          },
        },
        children: paras,
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
