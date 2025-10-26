import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { resumeDataSchema } from '@/lib/validation/schemas'
import { ZodError } from 'zod'
import { getUserSession } from '@/lib/db/session'
import { pdfRateLimiter, getRateLimitError } from '@/lib/rate-limit'
import { generateHash, getCachedPDF, cachePDF } from '@/lib/pdf-cache'

const execAsync = promisify(exec)

// Escape special LaTeX characters
function escapeLatex(text: string | any): string {
  if (!text) return ''
  // Convert to string if not already
  const str = typeof text === 'string' ? text : String(text)
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

// Generate dynamic main.tex that only includes sections with actual data
function generateMainTex(data: any): string {
  const {
    personalInfo,
    summary,
    skillCategories = [],
    experiences = [],
    projects = [],
    education = [],
    certifications = [],
    languages = [],
    awards = [],
    publications = [],
    extracurricular = [],
    volunteer = [],
    hobbies = [],
    sectionOrder = []
  } = data

  // Determine which sections have actual data
  const hasName = personalInfo?.firstName || personalInfo?.lastName
  const hasSummary = summary && summary.trim().length > 0
  const hasSkills = skillCategories.length > 0 && skillCategories.some((cat: any) =>
    cat && typeof cat === 'object' && (cat.name?.trim() || cat.skills?.trim())
  )
  const hasExperiences = experiences.length > 0 && experiences.some((exp: any) =>
    exp && typeof exp === 'object' && (exp.title?.trim() || exp.company?.trim())
  )
  const hasProjects = projects.length > 0 && projects.some((proj: any) =>
    proj && typeof proj === 'object' && (proj.title?.trim() || proj.description?.trim())
  )
  const hasEducation = education.length > 0 && education.some((edu: any) =>
    edu && typeof edu === 'object' && (edu.degree?.trim() || edu.university?.trim())
  )
  const hasCertifications = certifications.length > 0 && certifications.some((cert: any) =>
    cert && typeof cert === 'string' && cert.trim()
  )
  const hasLanguages = languages.length > 0 && languages.some((lang: any) =>
    lang && typeof lang === 'string' && lang.trim()
  )
  const hasAwards = awards.length > 0 && awards.some((award: any) =>
    award && typeof award === 'string' && award.trim()
  )
  const hasPublications = publications.length > 0 && publications.some((pub: any) =>
    pub && typeof pub === 'string' && pub.trim()
  )
  const hasExtracurricular = extracurricular.length > 0 && extracurricular.some((ext: any) =>
    ext && typeof ext === 'string' && ext.trim()
  )
  const hasVolunteer = volunteer.length > 0 && volunteer.some((vol: any) =>
    vol && typeof vol === 'string' && vol.trim()
  )
  const hasHobbies = hobbies.length > 0 && hobbies.some((hobby: any) =>
    hobby && typeof hobby === 'string' && hobby.trim()
  )

  // Check section order for enabled sections
  const enabledSections = new Set(
    sectionOrder.filter((s: any) => s.enabled).map((s: any) => s.id)
  )
  const isSectionEnabled = (sectionId: string) => {
    return enabledSections.size === 0 || enabledSections.has(sectionId)
  }

  let mainTex = `\\documentclass[10pt,a4paper]{article}

% Include common files
\\input{../common/preamble.tex}
\\input{../common/layout.tex}
\\input{../common/macros.tex}

% Include resume data
\\input{../data/RESUME_DATA.tex}

\\begin{document}

`

  // Only include header if there's a name
  if (hasName) {
    mainTex += `% Include header\n\\input{sections/header.tex}\n\n`
  }

  // Map section IDs to their data check and file path
  const sectionMap: Record<string, { hasData: boolean; file: string }> = {
    summary: { hasData: hasSummary, file: 'sections/summary.tex' },
    skills: { hasData: hasSkills, file: 'sections/skills.tex' },
    experience: { hasData: hasExperiences, file: 'sections/experience.tex' },
    projects: { hasData: hasProjects, file: 'sections/projects.tex' },
    education: { hasData: hasEducation, file: 'sections/education.tex' },
    certifications: { hasData: hasCertifications, file: 'sections/certifications.tex' },
    languages: { hasData: hasLanguages, file: 'sections/languages.tex' },
    awards: { hasData: hasAwards, file: 'sections/awards.tex' },
    publications: { hasData: hasPublications, file: 'sections/publications.tex' },
    extracurricular: { hasData: hasExtracurricular, file: 'sections/extracurricular.tex' },
    volunteer: { hasData: hasVolunteer, file: 'sections/volunteer.tex' },
    hobbies: { hasData: hasHobbies, file: 'sections/hobbies.tex' }
  }

  // Include sections in the order specified by sectionOrder array
  if (sectionOrder && sectionOrder.length > 0) {
    // Use the drag-and-drop order
    for (const section of sectionOrder) {
      const sectionInfo = sectionMap[section.id]
      if (sectionInfo && sectionInfo.hasData && section.enabled) {
        mainTex += `\\input{${sectionInfo.file}}\n`
      }
    }
  } else {
    // Fallback to default order if sectionOrder is not provided
    const defaultOrder = ['summary', 'skills', 'experience', 'projects', 'education',
      'certifications', 'languages', 'awards', 'publications',
      'extracurricular', 'volunteer', 'hobbies']
    for (const sectionId of defaultOrder) {
      const sectionInfo = sectionMap[sectionId]
      if (sectionInfo && sectionInfo.hasData && isSectionEnabled(sectionId)) {
        mainTex += `\\input{${sectionInfo.file}}\n`
      }
    }
  }

  mainTex += `\n\\end{document}\n`

  return mainTex
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const userId = await getUserSession()
    const rateLimitResult = pdfRateLimiter.check(userId.toString())

    if (!rateLimitResult.success) {
      return NextResponse.json(
        getRateLimitError(rateLimitResult.resetTime),
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      )
    }

    const rawData = await request.json()

    // Validate input data with Zod schema
    let data
    try {
      data = resumeDataSchema.parse(rawData)
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        console.error('Validation error:', validationError.issues)
        return NextResponse.json(
          {
            error: 'Invalid input data',
            details: validationError.issues.slice(0, 5) // Limit to first 5 errors
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Check cache first (unless disabled via header)
    const disableCache = request.headers.get('X-Disable-Cache') === 'true'
    const dataHash = generateHash(data)

    if (!disableCache) {
      const cachedPDF = await getCachedPDF(dataHash)

      if (cachedPDF) {
        return new NextResponse(cachedPDF as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=resume.pdf',
            'X-Cache': 'HIT'
          }
        })
      }
    }

    // Validate working directory to prevent command injection
    const rootDir = process.cwd()
    const resolvedRoot = path.resolve(rootDir)
    const expectedRoot = path.resolve(__dirname, '../../../../..')

    // Security: Ensure we're in the expected directory
    if (!resolvedRoot.startsWith(expectedRoot)) {
      console.error('Security: Invalid working directory detected')
      return NextResponse.json(
        { error: 'Invalid working directory' },
        { status: 500 }
      )
    }

    // Generate RESUME_DATA.tex content
    const resumeData = generateResumeDataTex(data)

    // Generate dynamic main.tex that only includes sections with data
    const mainTex = generateMainTex(data)

    // Write to files - use data directory for data file (writable in Docker)
    const dataFilePath = path.join(resolvedRoot, 'data', 'RESUME_DATA.tex')
    const mainFilePath = path.join(resolvedRoot, 'resume', 'main.tex')

    await fs.writeFile(dataFilePath, resumeData)
    await fs.writeFile(mainFilePath, mainTex)

    // Compile PDF using make with security constraints
    try {
      await execAsync('make resume', {
        cwd: resolvedRoot,
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB max buffer
      })
    } catch (execError: any) {
      console.error('PDF compilation error:', execError.message)
      return NextResponse.json(
        { error: 'PDF compilation failed. Please check your input.' },
        { status: 500 }
      )
    }

    // Read PDF
    const pdfPath = path.join(resolvedRoot, 'resume.pdf')
    const pdfBuffer = await fs.readFile(pdfPath)

    // Cache the generated PDF (unless caching is disabled)
    if (!disableCache) {
      await cachePDF(dataHash, pdfBuffer)
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=resume.pdf',
        'X-Cache': disableCache ? 'DISABLED' : 'MISS'
      }
    })
  } catch (error) {
    console.error('Error generating resume:', error)
    return NextResponse.json(
      { error: 'Failed to generate resume' },
      { status: 500 }
    )
  }
}

// Set maximum execution time for this route
export const maxDuration = 30 // 30 seconds

function generateResumeDataTex(data: any): string {
  const {
    personalInfo,
    summary,
    skillCategories = [],
    experiences = [],
    projects = [],
    education = [],
    certifications = [],
    languages = [],
    awards = [],
    publications = [],
    extracurricular = [],
    volunteer = [],
    hobbies = [],
    sectionOrder = []
  } = data

  // Create a map of enabled sections
  const enabledSections = new Set(
    sectionOrder.filter((s: any) => s.enabled).map((s: any) => s.id)
  )

  // Helper function to check if a section is enabled
  const isSectionEnabled = (sectionId: string) => {
    return enabledSections.size === 0 || enabledSections.has(sectionId)
  }

  let tex = `% Resume Data - Generated by Web App\n`

  // ========== GENERATE COMPLETE LATEX CONTENT FOR EACH SECTION ==========

  // HEADER SECTION - Generate complete LaTeX (ATS-Friendly: Left-aligned)
  const hasPersonalInfo = personalInfo?.firstName || personalInfo?.lastName
  if (hasPersonalInfo) {
    tex += `% Header Section Content\n`
    tex += `\\def\\HeaderContent{%\n`
    tex += `  \\noindent\n`
    tex += `  {\\fontsize{16}{18}\\selectfont\\bfseries ${escapeLatex(personalInfo?.firstName || '')} ${escapeLatex(personalInfo?.lastName || '')}}\n`
    tex += `  \\par\n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \n`
    tex += `  \\noindent\n`
    tex += `  {\\fontsize{9.5}{11}\\selectfont\n`

    // First line: Phone | Email
    const line1Parts = []
    if (personalInfo?.phone) line1Parts.push(escapeLatex(personalInfo.phone))
    if (personalInfo?.email) line1Parts.push(escapeLatex(personalInfo.email))
    if (line1Parts.length > 0) {
      tex += `    ${line1Parts.join(' | ')}\n`
    }

    // Second line: LinkedIn | GitHub | Website
    const line2Parts = []
    if (personalInfo?.linkedin) line2Parts.push(escapeLatex(personalInfo.linkedin))
    if (personalInfo?.github) line2Parts.push(escapeLatex(personalInfo.github))
    if (personalInfo?.website) line2Parts.push(escapeLatex(personalInfo.website))
    if (line2Parts.length > 0) {
      tex += `    \\\\[2pt]\n`
      tex += `    ${line2Parts.join(' | ')}\n`
    }

    tex += `  }\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\HeaderContent{}\n\n`
  }

  // SUMMARY SECTION - Generate complete LaTeX
  const hasSummary = isSectionEnabled('summary') && summary && summary.trim().length > 0
  if (hasSummary) {
    tex += `% Summary Section Content\n`
    tex += `\\def\\SummaryContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Professional Summary}\n`
    tex += `  \\noindent\n`
    tex += `  ${escapeLatex(summary)}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\SummaryContent{}\n\n`
  }

  // SKILLS SECTION - Generate complete LaTeX
  const actualSkillCategories = isSectionEnabled('skills')
    ? skillCategories.filter((cat: any) => cat.name && cat.skills)
    : []

  if (actualSkillCategories.length > 0) {
    tex += `% Skills Section Content\n`
    tex += `\\def\\SkillsContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Technical Skills}\n`
    tex += `  \n`

    for (let i = 0; i < actualSkillCategories.length; i++) {
      const cat = actualSkillCategories[i]
      if (i > 0) {
        tex += `  \\vspace{1.5pt}\n`
      }
      tex += `  \\noindent\n`
      tex += `  \\textbf{${escapeLatex(cat.name)}:} ${escapeLatex(cat.skills)}\n`
      tex += `  \n`
    }

    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\SkillsContent{}\n\n`
  }

  // EXPERIENCE SECTION - Generate complete LaTeX
  const actualExperiences = isSectionEnabled('experience')
    ? experiences.filter((exp: any) =>
      exp.title || exp.company || exp.location || exp.dates || (exp.bullets && exp.bullets.some((b: string) => b))
    )
    : []

  tex += `% Experience Section Content\n`
  if (actualExperiences.length > 0) {
    tex += `\\def\\ExperienceContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Professional Experience}\n`

    for (let i = 0; i < actualExperiences.length; i++) {
      const exp = actualExperiences[i]
      const bullets = (exp.bullets || []).filter((b: string) => b)

      tex += `  \\noindent\n`
      tex += `  \\textbf{${escapeLatex(exp.company || '')}} \\hfill ${escapeLatex(exp.dates || '')}\n`
      tex += `  \n`
      tex += `  \\noindent\n`
      tex += `  \\textit{${escapeLatex(exp.title || '')}} | ${escapeLatex(exp.location || '')}\n`
      tex += `  \\vspace{1pt}\n`

      if (bullets.length > 0) {
        tex += `  \\begin{itemize}[leftmargin=0.15in]\\tightitem\n`
        for (const bullet of bullets) {
          tex += `    \\item ${escapeLatex(bullet)}\n`
        }
        tex += `  \\end{itemize}\n`
      }
      tex += `  \\vspace{4pt}\n`
    }

    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\ExperienceContent{}\n\n`
  }

  // PROJECTS SECTION - Generate complete LaTeX
  const actualProjects = isSectionEnabled('projects')
    ? projects.filter((proj: any) =>
      proj.title || proj.description || (proj.bullets && proj.bullets.some((b: string) => b))
    )
    : []

  tex += `% Projects Section Content\n`
  if (actualProjects.length > 0) {
    tex += `\\def\\ProjectsContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Projects}\n`

    for (let i = 0; i < actualProjects.length; i++) {
      const proj = actualProjects[i]
      const bullets = (proj.bullets || []).filter((b: string) => b)

      tex += `  \\noindent\n`
      tex += `  \\textbf{${escapeLatex(proj.title || '')}}\n`
      tex += `  \\vspace{1pt}\n`

      if (proj.description) {
        tex += `  \n`
        tex += `  \\noindent\n`
        tex += `  \\textit{${escapeLatex(proj.description)}}\n`
        tex += `  \\vspace{1pt}\n`
      }

      if (bullets.length > 0) {
        tex += `  \\begin{itemize}[leftmargin=0.15in]\\tightitem\n`
        for (const bullet of bullets) {
          tex += `    \\item ${escapeLatex(bullet)}\n`
        }
        tex += `  \\end{itemize}\n`
      }
      tex += `  \\vspace{4pt}\n`
    }

    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\ProjectsContent{}\n\n`
  }

  // EDUCATION SECTION - Generate complete LaTeX
  const actualEducation = isSectionEnabled('education')
    ? education.filter((edu: any) =>
      edu.degree || edu.institution || edu.location || edu.dates || edu.gpa
    )
    : []

  tex += `% Education Section Content\n`
  if (actualEducation.length > 0) {
    tex += `\\def\\EducationContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Education}\n`

    for (const edu of actualEducation) {
      tex += `  \\noindent\n`
      tex += `  \\textbf{${escapeLatex(edu.institution || '')}} \\hfill ${escapeLatex(edu.dates || '')}\n`
      tex += `  \\par\n`
      tex += `  \\noindent\n`
      tex += `  \\textit{${escapeLatex(edu.degree || '')}}`
      if (edu.location) {
        tex += ` | ${escapeLatex(edu.location)}`
      }
      if (edu.gpa) {
        tex += ` | GPA: ${escapeLatex(edu.gpa)}`
      }
      tex += `\n`
      tex += `  \\par\n`
      tex += `  \\vspace{6pt}\n`
    }

    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\EducationContent{}\n\n`
  }

  // CERTIFICATIONS SECTION - Generate complete LaTeX
  const actualCertifications = isSectionEnabled('certifications')
    ? certifications.filter((cert: string) => cert)
    : []

  tex += `% Certifications Section Content\n`
  if (actualCertifications.length > 0) {
    tex += `\\def\\CertificationsContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Certifications}\n`
    tex += `  \n`
    tex += `  \\begin{itemize}[leftmargin=0.15in]\\tightitem\n`
    for (const cert of actualCertifications) {
      tex += `    \\item ${escapeLatex(cert)}\n`
    }
    tex += `  \\end{itemize}\n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\CertificationsContent{}\n\n`
  }

  // LANGUAGES SECTION - Generate complete LaTeX
  const actualLanguages = isSectionEnabled('languages')
    ? languages.filter((lang: string) => lang)
    : []

  tex += `% Languages Section Content\n`
  if (actualLanguages.length > 0) {
    tex += `\\def\\LanguagesContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Languages}\n`
    tex += `  \n`
    tex += `  \\noindent\n`
    tex += `  ${actualLanguages.map((lang: string) => escapeLatex(lang)).join(' | ')}\n`
    tex += `  \n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\LanguagesContent{}\n\n`
  }

  // AWARDS SECTION - Generate complete LaTeX
  const actualAwards = isSectionEnabled('awards')
    ? awards.filter((award: string) => award)
    : []

  tex += `% Awards Section Content\n`
  if (actualAwards.length > 0) {
    tex += `\\def\\AwardsContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Awards \\& Honors}\n`
    tex += `  \n`
    tex += `  \\begin{itemize}[leftmargin=0.15in]\\tightitem\n`
    for (const award of actualAwards) {
      tex += `    \\item ${escapeLatex(award)}\n`
    }
    tex += `  \\end{itemize}\n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\AwardsContent{}\n\n`
  }

  // PUBLICATIONS SECTION - Generate complete LaTeX
  const actualPublications = isSectionEnabled('publications')
    ? publications.filter((pub: string) => pub)
    : []

  tex += `% Publications Section Content\n`
  if (actualPublications.length > 0) {
    tex += `\\def\\PublicationsContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Publications}\n`
    tex += `  \n`
    tex += `  \\begin{itemize}[leftmargin=0.15in]\\tightitem\n`
    for (const pub of actualPublications) {
      tex += `    \\item ${escapeLatex(pub)}\n`
    }
    tex += `  \\end{itemize}\n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\PublicationsContent{}\n\n`
  }

  // EXTRACURRICULAR SECTION - Generate complete LaTeX
  const actualExtracurricular = isSectionEnabled('extracurricular')
    ? extracurricular.filter((extra: string) => extra)
    : []

  tex += `% Extracurricular Section Content\n`
  if (actualExtracurricular.length > 0) {
    tex += `\\def\\ExtracurricularContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Extracurricular Activities}\n`
    tex += `  \n`
    tex += `  \\begin{itemize}[leftmargin=0.15in]\\tightitem\n`
    for (const extra of actualExtracurricular) {
      tex += `    \\item ${escapeLatex(extra)}\n`
    }
    tex += `  \\end{itemize}\n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\ExtracurricularContent{}\n\n`
  }

  // VOLUNTEER SECTION - Generate complete LaTeX
  const actualVolunteer = isSectionEnabled('volunteer')
    ? volunteer.filter((vol: string) => vol)
    : []

  tex += `% Volunteer Section Content\n`
  if (actualVolunteer.length > 0) {
    tex += `\\def\\VolunteerContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Volunteer Experience}\n`
    tex += `  \n`
    tex += `  \\begin{itemize}[leftmargin=0.15in]\\tightitem\n`
    for (const vol of actualVolunteer) {
      tex += `    \\item ${escapeLatex(vol)}\n`
    }
    tex += `  \\end{itemize}\n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\VolunteerContent{}\n\n`
  }

  // HOBBIES SECTION - Generate complete LaTeX
  const actualHobbies = isSectionEnabled('hobbies')
    ? hobbies.filter((hobby: string) => hobby)
    : []

  tex += `% Hobbies Section Content\n`
  if (actualHobbies.length > 0) {
    tex += `\\def\\HobbiesContent{%\n`
    tex += `  \\par\n`
    tex += `  \\SectionHeading{Interests \\& Hobbies}\n`
    tex += `  \\noindent\n`
    tex += `  ${actualHobbies.map((hobby: string) => escapeLatex(hobby)).join(' | ')}\n`
    tex += `  \\vspace{3pt}\n`
    tex += `  \\par\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\HobbiesContent{}\n\n`
  }

  return tex
}

