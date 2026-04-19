import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from 'docx'
import type { ResumeData } from '@/lib/validation/schemas'
import { extractHandle, profileUrl } from './shared-css'

/**
 * Resume → .docx rendered directly from JSON (no HTML → Word conversion).
 * Mirrors the look of the PDF template: Arial 10.5pt body, UPPERCASE section
 * headings with a thin bottom rule, bullets indented, single column.
 */

const INK = '0F172A'
const META = '475569'
const MUTED = '64748B'
const RULE = 'CBD5E1'

/** Convert points to half-points, the unit docx uses for font size. */
const pt = (n: number) => n * 2
/** Convert inches to twips (1in = 1440 twips). */
const inch = (n: number) => Math.round(n * 1440)

const BODY_FONT = 'Arial'
const BODY_SIZE = pt(10.5)
const META_SIZE = pt(9.75)
const NAME_SIZE = pt(20)

function section(children: Paragraph[]): Paragraph[] {
  return children
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: pt(8), after: pt(3), line: 280 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 2 } },
    children: [
      new TextRun({
        text,
        bold: true,
        font: BODY_FONT,
        size: BODY_SIZE,
        color: INK,
        characterSpacing: 20,
        allCaps: true,
      }),
    ],
  })
}

function bodyRun(text: string, opts: Partial<{ bold: boolean; italics: boolean; color: string; size: number }> = {}): TextRun {
  return new TextRun({
    text,
    font: BODY_FONT,
    size: opts.size ?? BODY_SIZE,
    color: opts.color ?? INK,
    bold: opts.bold,
    italics: opts.italics,
  })
}

function plainParagraph(text: string, spaceAfterPt = 2): Paragraph {
  return new Paragraph({
    spacing: { after: pt(spaceAfterPt), line: 280 },
    children: [bodyRun(text)],
  })
}

function itemHead(left: string, right: string): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { after: 0, line: 280 },
    children: [
      bodyRun(left, { bold: true }),
      right ? new TextRun({ text: `\t${right}`, font: BODY_FONT, size: META_SIZE, color: MUTED, italics: true }) : new TextRun(''),
    ],
  })
}

function itemSub(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 0, line: 280 },
    children: [bodyRun(text, { size: META_SIZE, color: META, italics: true })],
  })
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    spacing: { after: 30, line: 280 },
    numbering: { reference: 'resume-bullets', level },
    children: [bodyRun(text)],
  })
}

function trailingItemSpacer(): Paragraph {
  return new Paragraph({ spacing: { after: pt(3) }, children: [] })
}

function metaRun(text: string): TextRun {
  return new TextRun({ text, font: BODY_FONT, size: META_SIZE, color: META })
}

function hyperlinkRun(label: string, url: string, opts: { underline?: boolean } = {}): ExternalHyperlink {
  return new ExternalHyperlink({
    link: url,
    children: [
      new TextRun({
        text: label,
        font: BODY_FONT,
        size: META_SIZE,
        color: META,
        underline: opts.underline !== false ? {} : undefined,
      }),
    ],
  })
}

function contactChildren(p: NonNullable<ResumeData['personalInfo']>): (TextRun | ExternalHyperlink)[] {
  const children: (TextRun | ExternalHyperlink)[] = []
  const sep = '  \u2022  '

  const push = (node: TextRun | ExternalHyperlink) => {
    if (children.length > 0) children.push(metaRun(sep))
    children.push(node)
  }
  const pushText = (text: string) => push(metaRun(text))

  if (p.email?.trim()) {
    push(hyperlinkRun(p.email.trim(), `mailto:${p.email.trim()}`))
  }
  if (p.phone?.trim()) {
    pushText(p.phone.trim())
  }
  if (p.linkedin?.trim()) {
    const h = extractHandle(p.linkedin, 'linkedin')
    const url = profileUrl(h, 'linkedin')
    if (h && url) {
      if (children.length > 0) children.push(metaRun(sep))
      children.push(metaRun('linkedin: '))
      children.push(hyperlinkRun(h, url))
    } else {
      pushText(p.linkedin.trim())
    }
  }
  if (p.github?.trim()) {
    const h = extractHandle(p.github, 'github')
    const url = profileUrl(h, 'github')
    if (h && url) {
      if (children.length > 0) children.push(metaRun(sep))
      children.push(metaRun('github: '))
      children.push(hyperlinkRun(h, url))
    } else {
      pushText(p.github.trim())
    }
  }
  if (p.address?.trim()) {
    pushText(p.address.trim())
  }
  return children
}

function headerBlock(data: ResumeData): Paragraph[] {
  const p: NonNullable<ResumeData['personalInfo']> =
    data.personalInfo || ({} as NonNullable<ResumeData['personalInfo']>)
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Your Name'

  const nameP = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: pt(1), line: 240 },
    children: [
      new TextRun({
        text: fullName,
        font: BODY_FONT,
        size: NAME_SIZE,
        bold: true,
        color: INK,
        allCaps: true,
        characterSpacing: 20,
      }),
    ],
  })

  const contactP = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: pt(2), line: 260 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 2 } },
    children: contactChildren(p),
  })

  const spacer = new Paragraph({ spacing: { after: pt(4) }, children: [] })

  return [nameP, contactP, spacer]
}

function renderSummary(summary?: string): Paragraph[] {
  if (!summary?.trim()) return []
  return section([
    sectionHeading('Summary'),
    plainParagraph(summary.trim(), 4),
  ])
}

function renderSkills(cats?: ResumeData['skillCategories']): Paragraph[] {
  const items = (cats || []).filter(c => c.skills?.trim())
  if (!items.length) return []
  const paras: Paragraph[] = [sectionHeading('Skills')]
  for (const c of items) {
    paras.push(
      new Paragraph({
        spacing: { after: 30, line: 280 },
        children: [
          bodyRun(`${c.name || 'Skills'}: `, { bold: true }),
          bodyRun(c.skills),
        ],
      })
    )
  }
  paras.push(trailingItemSpacer())
  return paras
}

function renderExperience(items?: ResumeData['experiences']): Paragraph[] {
  const list = (items || []).filter(e => e.title || e.company || (e.bullets && e.bullets.length))
  if (!list.length) return []
  const paras: Paragraph[] = [sectionHeading('Experience')]
  list.forEach((e, idx) => {
    paras.push(itemHead(e.title, e.dates))
    const sub = [e.company, e.location].filter(Boolean).join(' • ')
    if (sub) paras.push(itemSub(sub))
    const bullets = (e.bullets || []).filter(b => b && b.trim())
    for (const b of bullets) paras.push(bullet(b.trim()))
    if (idx < list.length - 1) paras.push(trailingItemSpacer())
  })
  paras.push(trailingItemSpacer())
  return paras
}

function renderProjects(items?: ResumeData['projects']): Paragraph[] {
  const list = (items || []).filter(p => p.title || p.description || (p.bullets && p.bullets.length))
  if (!list.length) return []
  const paras: Paragraph[] = [sectionHeading('Projects')]
  list.forEach((p, idx) => {
    paras.push(itemHead(p.title, ''))
    const bullets = (p.bullets || []).filter(b => b && b.trim())
    if (bullets.length) {
      for (const b of bullets) paras.push(bullet(b.trim()))
    } else if (p.description) {
      paras.push(plainParagraph(p.description, 2))
    }
    if (idx < list.length - 1) paras.push(trailingItemSpacer())
  })
  paras.push(trailingItemSpacer())
  return paras
}

function renderEducation(items?: ResumeData['education']): Paragraph[] {
  const list = (items || []).filter(e => e.degree || e.institution)
  if (!list.length) return []
  const paras: Paragraph[] = [sectionHeading('Education')]
  list.forEach((e, idx) => {
    paras.push(itemHead(e.degree, e.dates))
    const sub = [e.institution, e.location].filter(Boolean).join(' • ')
    const full = e.gpa ? (sub ? `${sub}  •  GPA ${e.gpa}` : `GPA ${e.gpa}`) : sub
    if (full) paras.push(itemSub(full))
    if (idx < list.length - 1) paras.push(trailingItemSpacer())
  })
  paras.push(trailingItemSpacer())
  return paras
}

function renderSimpleList(title: string, items?: string[]): Paragraph[] {
  const list = (items || []).filter(v => v?.trim())
  if (!list.length) return []
  return section([
    sectionHeading(title),
    plainParagraph(list.map(s => s.trim()).join('  •  '), 4),
  ])
}

function renderPublications(items?: ResumeData['publications']): Paragraph[] {
  const list = (items || []).filter(p => p.title || p.details)
  if (!list.length) return []
  const paras: Paragraph[] = [sectionHeading('Publications')]
  list.forEach((p, idx) => {
    paras.push(itemHead(p.title, ''))
    if (p.details) {
      paras.push(
        new Paragraph({
          spacing: { after: 0, line: 280 },
          children: [bodyRun(p.details, { size: META_SIZE, color: MUTED })],
        })
      )
    }
    if (idx < list.length - 1) paras.push(trailingItemSpacer())
  })
  paras.push(trailingItemSpacer())
  return paras
}

function renderActivities(title: string, items?: ResumeData['extracurricular']): Paragraph[] {
  const list = (items || []).filter(a => a.title || a.details)
  if (!list.length) return []
  const paras: Paragraph[] = [sectionHeading(title)]
  list.forEach((a, idx) => {
    paras.push(itemHead(a.title, ''))
    if (a.details) paras.push(plainParagraph(a.details, 2))
    if (idx < list.length - 1) paras.push(trailingItemSpacer())
  })
  paras.push(trailingItemSpacer())
  return paras
}

function renderSectionById(id: string, data: ResumeData): Paragraph[] {
  switch (id) {
    case 'summary': return renderSummary(data.summary)
    case 'skills': return renderSkills(data.skillCategories)
    case 'experience': return renderExperience(data.experiences)
    case 'projects': return renderProjects(data.projects)
    case 'education': return renderEducation(data.education)
    case 'certifications': return renderSimpleList('Certifications', data.certifications)
    case 'languages': return renderSimpleList('Languages', data.languages)
    case 'awards': return renderSimpleList('Awards', data.awards)
    case 'publications': return renderPublications(data.publications)
    case 'extracurricular': return renderActivities('Extracurricular', data.extracurricular)
    case 'volunteer': return renderActivities('Volunteer', data.volunteer)
    case 'hobbies': return renderSimpleList('Hobbies', data.hobbies)
    default: return []
  }
}

const DEFAULT_ORDER = [
  'summary', 'skills', 'experience', 'projects', 'education',
  'certifications', 'languages', 'awards', 'publications',
  'extracurricular', 'volunteer', 'hobbies',
]

export async function renderResumeDocx(data: ResumeData): Promise<Buffer> {
  const order = data.sectionOrder?.length
    ? data.sectionOrder.filter(s => s.enabled).map(s => s.id)
    : DEFAULT_ORDER

  const body: Paragraph[] = [
    ...headerBlock(data),
    ...order.flatMap(id => renderSectionById(id, data)),
  ]

  const doc = new Document({
    creator: 'Headhunter',
    title: `${[data.personalInfo?.firstName, data.personalInfo?.lastName].filter(Boolean).join(' ') || 'Your Name'} — Resume`,
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE, color: INK },
          paragraph: { spacing: { line: 280 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'resume-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: inch(0.22), hanging: inch(0.18) },
                },
                run: { font: BODY_FONT, size: BODY_SIZE, color: INK },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: inch(0.55), right: inch(0.55), bottom: inch(0.55), left: inch(0.55) },
            size: { width: inch(8.5), height: inch(11) },
          },
        },
        children: body,
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
