import type { ResumeData } from '@/lib/validation/schemas'
import { SHARED_BASE_CSS, SHARED_TOKENS, extractHandle, profileUrl } from './shared-css'

function escape(s: unknown): string {
  const str = String(s ?? '')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function contactLine(p: NonNullable<ResumeData['personalInfo']>): string {
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
    const handle = extractHandle(p.linkedin, 'linkedin')
    const url = profileUrl(handle, 'linkedin')
    if (handle && url) {
      parts.push(`linkedin: <a class="link-accent" href="${url}">${escape(handle)}</a>`)
    } else if (p.linkedin.trim()) {
      parts.push(escape(p.linkedin.trim()))
    }
  }
  if (p.github?.trim()) {
    const handle = extractHandle(p.github, 'github')
    const url = profileUrl(handle, 'github')
    if (handle && url) {
      parts.push(`github: <a class="link-accent" href="${url}">${escape(handle)}</a>`)
    } else if (p.github.trim()) {
      parts.push(escape(p.github.trim()))
    }
  }
  if (p.address?.trim()) parts.push(escape(p.address.trim()))
  return parts.join('  \u2022  ')
}

function renderSummary(summary?: string): string {
  if (!summary?.trim()) return ''
  return `
    <section>
      <h2>Summary</h2>
      <p class="summary">${escape(summary.trim())}</p>
    </section>`
}

function renderSkills(cats?: ResumeData['skillCategories']): string {
  const items = (cats || []).filter(c => c.skills?.trim())
  if (!items.length) return ''
  return `
    <section>
      <h2>Skills</h2>
      <ul class="skills-list">
        ${items
          .map(
            c => `<li><span class="cat">${escape(c.name || 'Skills')}:</span> ${escape(c.skills)}</li>`
          )
          .join('')}
      </ul>
    </section>`
}

function renderExperience(items?: ResumeData['experiences']): string {
  const list = (items || []).filter(e => e.title || e.company || (e.bullets && e.bullets.length))
  if (!list.length) return ''
  return `
    <section>
      <h2>Experience</h2>
      ${list
        .map(
          e => `
        <article class="item">
          <div class="item-head">
            <strong>${escape(e.title)}</strong>
            <span class="meta">${escape(e.dates)}</span>
          </div>
          <div class="item-sub">
            ${[e.company, e.location].filter(Boolean).map(escape).join(' \u2022 ')}
          </div>
          ${
            (e.bullets || []).filter(b => b && b.trim()).length
              ? `<ul class="bullets">${e.bullets
                  .filter(b => b && b.trim())
                  .map(b => `<li>${escape(b.trim())}</li>`)
                  .join('')}</ul>`
              : ''
          }
        </article>`
        )
        .join('')}
    </section>`
}

function renderProjects(items?: ResumeData['projects']): string {
  const list = (items || []).filter(p => p.title || p.description || (p.bullets && p.bullets.length))
  if (!list.length) return ''
  return `
    <section>
      <h2>Projects</h2>
      ${list
        .map(p => {
          const bullets = (p.bullets || []).filter(b => b && b.trim())
          const bulletsHtml = bullets.length
            ? `<ul class="bullets">${bullets.map(b => `<li>${escape(b.trim())}</li>`).join('')}</ul>`
            : ''
          const descHtml = p.description && !bullets.length
            ? `<p class="project-desc">${escape(p.description)}</p>`
            : ''
          return `
        <article class="item">
          <div class="item-head"><strong>${escape(p.title)}</strong></div>
          ${descHtml}
          ${bulletsHtml}
        </article>`
        })
        .join('')}
    </section>`
}

function renderEducation(items?: ResumeData['education']): string {
  const list = (items || []).filter(e => e.degree || e.institution)
  if (!list.length) return ''
  return `
    <section>
      <h2>Education</h2>
      ${list
        .map(
          e => `
        <article class="item">
          <div class="item-head">
            <strong>${escape(e.degree)}</strong>
            <span class="meta">${escape(e.dates)}</span>
          </div>
          <div class="item-sub">
            ${[e.institution, e.location].filter(Boolean).map(escape).join(' \u2022 ')}${
              e.gpa ? `  \u2022  GPA ${escape(e.gpa)}` : ''
            }
          </div>
        </article>`
        )
        .join('')}
    </section>`
}

function renderSimpleList(title: string, items?: string[]): string {
  const list = (items || []).filter(v => v?.trim())
  if (!list.length) return ''
  return `
    <section>
      <h2>${escape(title)}</h2>
      <p class="inline-list">${list.map(v => escape(v.trim())).join('  \u2022  ')}</p>
    </section>`
}

function renderPublications(items?: ResumeData['publications']): string {
  const list = (items || []).filter(p => p.title || p.details)
  if (!list.length) return ''
  return `
    <section>
      <h2>Publications</h2>
      ${list
        .map(
          p => `
        <article class="item">
          <div class="item-head"><strong>${escape(p.title)}</strong></div>
          ${p.details ? `<p class="project-desc">${escape(p.details)}</p>` : ''}
        </article>`
        )
        .join('')}
    </section>`
}

function renderActivities(title: string, items?: ResumeData['extracurricular']): string {
  const list = (items || []).filter(a => a.title || a.details)
  if (!list.length) return ''
  return `
    <section>
      <h2>${escape(title)}</h2>
      ${list
        .map(
          a => `
        <article class="item">
          <div class="item-head"><strong>${escape(a.title)}</strong></div>
          ${a.details ? `<p class="project-desc">${escape(a.details)}</p>` : ''}
        </article>`
        )
        .join('')}
    </section>`
}

function renderSectionById(id: string, data: ResumeData): string {
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
    default: return ''
  }
}

const DEFAULT_ORDER = [
  'summary', 'skills', 'experience', 'projects', 'education',
  'certifications', 'languages', 'awards', 'publications',
  'extracurricular', 'volunteer', 'hobbies',
]

const RESUME_CSS = `
  ${SHARED_BASE_CSS}
  header.top {
    text-align: center;
    padding-bottom: 5pt;
    border-bottom: 1pt solid ${SHARED_TOKENS.ink};
    margin-bottom: 6pt;
  }
  header.top h1 {
    font-size: ${SHARED_TOKENS.nameResume};
    font-weight: 700;
    letter-spacing: 1pt;
    text-transform: uppercase;
    margin: 0 0 2pt;
  }
  header.top .contact {
    margin: 0;
    font-size: ${SHARED_TOKENS.metaSize};
    color: ${SHARED_TOKENS.meta};
  }
  section { margin: 0; }
  section + section { margin-top: 0; }
  p.summary {
    margin: 0;
    line-height: 1.4;
  }
  ul { margin: 0; padding: 0; list-style: none; }
  .skills-list { margin: 0; padding: 0; }
  .skills-list li { margin: 0 0 2pt; }
  .skills-list .cat { font-weight: 700; }
  .inline-list { margin: 0; }
  .item { margin: 0 0 5pt; page-break-inside: avoid; }
  .item:last-child { margin-bottom: 0; }
  .item-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12pt;
  }
  .item-head strong { font-size: ${SHARED_TOKENS.bodySize}; font-weight: 700; }
  .item-head .meta { font-size: ${SHARED_TOKENS.metaSize}; color: ${SHARED_TOKENS.muted}; white-space: nowrap; font-style: italic; }
  .item-sub {
    font-size: ${SHARED_TOKENS.metaSize};
    color: ${SHARED_TOKENS.meta};
    font-style: italic;
    margin-top: 0;
  }
  .project-desc { margin: 2pt 0 0; line-height: 1.35; }
  .bullets {
    margin: 3pt 0 0;
    padding-left: 14pt;
    list-style: disc;
  }
  .bullets li {
    margin: 0 0 1pt;
    line-height: 1.35;
    padding-left: 2pt;
  }
`

export function renderResumeHtml(data: ResumeData): string {
  const p = data.personalInfo || {}
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Your Name'
  const order = data.sectionOrder?.length
    ? data.sectionOrder.filter(s => s.enabled).map(s => s.id)
    : DEFAULT_ORDER

  const sections = order.map(id => renderSectionById(id, data)).filter(Boolean).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escape(fullName)} — Resume</title>
<style>${RESUME_CSS}</style>
</head>
<body>
<header class="top">
  <h1>${escape(fullName)}</h1>
  <p class="contact">${contactLine(p)}</p>
</header>
${sections}
</body>
</html>`
}
