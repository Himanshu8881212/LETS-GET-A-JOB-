import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

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
\\input{../RESUME_DATA.tex}

\\begin{document}

`

  // Only include header if there's a name
  if (hasName) {
    mainTex += `% Include header\n\\input{sections/header.tex}\n\n`
  }

  // Only include sections that have data AND are enabled
  if (hasSummary && isSectionEnabled('summary')) {
    mainTex += `\\input{sections/summary.tex}\n`
  }

  if (hasSkills && isSectionEnabled('skills')) {
    mainTex += `\\input{sections/skills.tex}\n`
  }

  if (hasExperiences && isSectionEnabled('experience')) {
    mainTex += `\\input{sections/experience.tex}\n`
  }

  if (hasProjects && isSectionEnabled('projects')) {
    mainTex += `\\input{sections/projects.tex}\n`
  }

  if (hasEducation && isSectionEnabled('education')) {
    mainTex += `\\input{sections/education.tex}\n`
  }

  if (hasCertifications && isSectionEnabled('certifications')) {
    mainTex += `\\input{sections/certifications.tex}\n`
  }

  if (hasLanguages && isSectionEnabled('languages')) {
    mainTex += `\\input{sections/languages.tex}\n`
  }

  if (hasAwards && isSectionEnabled('awards')) {
    mainTex += `\\input{sections/awards.tex}\n`
  }

  if (hasPublications && isSectionEnabled('publications')) {
    mainTex += `\\input{sections/publications.tex}\n`
  }

  if (hasExtracurricular && isSectionEnabled('extracurricular')) {
    mainTex += `\\input{sections/extracurricular.tex}\n`
  }

  if (hasVolunteer && isSectionEnabled('volunteer')) {
    mainTex += `\\input{sections/volunteer.tex}\n`
  }

  if (hasHobbies && isSectionEnabled('hobbies')) {
    mainTex += `\\input{sections/hobbies.tex}\n`
  }

  mainTex += `\n\\end{document}\n`

  return mainTex
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Generate RESUME_DATA.tex content
    const resumeData = generateResumeDataTex(data)

    // Generate dynamic main.tex that only includes sections with data
    const mainTex = generateMainTex(data)

    // Write to files in current directory (LETS-GET-A-JOB)
    const rootDir = process.cwd()
    const dataFilePath = path.join(rootDir, 'RESUME_DATA.tex')
    const mainFilePath = path.join(rootDir, 'resume', 'main.tex')

    await fs.writeFile(dataFilePath, resumeData)
    await fs.writeFile(mainFilePath, mainTex)

    // Compile PDF using make
    await execAsync('make resume', { cwd: rootDir })

    // Read PDF
    const pdfPath = path.join(rootDir, 'resume.pdf')
    const pdfBuffer = await fs.readFile(pdfPath)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=resume.pdf'
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

  let tex = `% Resume Data - Generated by Web App
% Personal Information
\\newcommand{\\FirstName}{${escapeLatex(personalInfo?.firstName || '')}}
\\newcommand{\\LastName}{${escapeLatex(personalInfo?.lastName || '')}}
\\newcommand{\\Email}{${escapeLatex(personalInfo?.email || '')}}
\\newcommand{\\Phone}{${escapeLatex(personalInfo?.phone || '')}}
\\newcommand{\\LinkedIn}{${escapeLatex(personalInfo?.linkedin || '')}}
\\newcommand{\\GitHub}{${escapeLatex(personalInfo?.github || '')}}
\\newcommand{\\Website}{${escapeLatex(personalInfo?.website || '')}}
\\newcommand{\\City}{${escapeLatex(personalInfo?.city || '')}}

% Professional Summary
\\newcommand{\\ProfessionalSummary}{${isSectionEnabled('summary') ? escapeLatex(summary || '') : ''}}

% Skills - Dynamic Categories
`

  // Add skill categories dynamically - only if section is enabled and there are actual categories
  const categoryNames = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
  const actualSkillCategories = isSectionEnabled('skills')
    ? skillCategories.filter((cat: any) => cat.name || cat.skills)
    : []

  if (actualSkillCategories.length > 0) {
    for (let i = 0; i < actualSkillCategories.length; i++) {
      const catName = categoryNames[i]
      const category = actualSkillCategories[i]
      tex += `\\newcommand{\\SkillCategory${catName}Name}{${escapeLatex(category.name || '')}}\n`
      tex += `\\newcommand{\\SkillCategory${catName}Skills}{${escapeLatex(category.skills || '')}}\n`
    }
  } else {
    // Define at least one empty category to avoid LaTeX errors
    tex += `\\newcommand{\\SkillCategoryOneName}{}\n`
    tex += `\\newcommand{\\SkillCategoryOneSkills}{}\n`
  }

  tex += `\n`

  // Add experiences - only if section is enabled and there are actual experiences with data
  const expNames = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
  const bulletNames = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

  const actualExperiences = isSectionEnabled('experience')
    ? experiences.filter((exp: any) =>
      exp.title || exp.company || exp.location || exp.dates || (exp.bullets && exp.bullets.some((b: string) => b))
    )
    : []

  if (actualExperiences.length > 0) {
    for (let i = 0; i < actualExperiences.length; i++) {
      const expName = expNames[i]
      const exp = actualExperiences[i]
      tex += `% Experience ${i + 1}
\\newcommand{\\Exp${expName}Title}{${escapeLatex(exp.title || '')}}
\\newcommand{\\Exp${expName}Company}{${escapeLatex(exp.company || '')}}
\\newcommand{\\Exp${expName}Location}{${escapeLatex(exp.location || '')}}
\\newcommand{\\Exp${expName}Dates}{${escapeLatex(exp.dates || '')}}
`
      const bullets = (exp.bullets || []).filter((b: string) => b)
      for (let j = 0; j < bullets.length; j++) {
        const bulletNum = bulletNames[j]
        tex += `\\newcommand{\\Exp${expName}Bullet${bulletNum}}{${escapeLatex(bullets[j])}}\n`
      }
      tex += '\n'
    }
  } else {
    // Define minimal empty experience to avoid LaTeX errors
    tex += `% No experiences
\\newcommand{\\ExpOneTitle}{}
\\newcommand{\\ExpOneCompany}{}
\\newcommand{\\ExpOneLocation}{}
\\newcommand{\\ExpOneDates}{}
\\newcommand{\\ExpOneBulletOne}{}

`
  }

  // Add projects - only if section is enabled and there are actual projects with data
  const actualProjects = isSectionEnabled('projects')
    ? projects.filter((proj: any) =>
      proj.title || proj.description || (proj.bullets && proj.bullets.some((b: string) => b))
    )
    : []

  if (actualProjects.length > 0) {
    for (let i = 0; i < actualProjects.length; i++) {
      const projName = expNames[i]
      const proj = actualProjects[i]
      tex += `% Project ${i + 1}
\\newcommand{\\Project${projName}Title}{${escapeLatex(proj.title || '')}}
\\newcommand{\\Project${projName}Description}{${escapeLatex(proj.description || '')}}
`
      const bullets = (proj.bullets || []).filter((b: string) => b)
      for (let j = 0; j < bullets.length; j++) {
        const bulletNum = bulletNames[j]
        tex += `\\newcommand{\\Project${projName}Bullet${bulletNum}}{${escapeLatex(bullets[j])}}\n`
      }
      tex += '\n'
    }
  } else {
    // Define minimal empty project to avoid LaTeX errors
    tex += `% No projects
\\newcommand{\\ProjectOneTitle}{}
\\newcommand{\\ProjectOneDescription}{}

`
  }

  // Add education - only if section is enabled and there is actual education with data
  const actualEducation = isSectionEnabled('education')
    ? education.filter((edu: any) =>
      edu.degree || edu.institution || edu.location || edu.dates || edu.gpa
    )
    : []

  if (actualEducation.length > 0) {
    for (let i = 0; i < actualEducation.length; i++) {
      const eduName = expNames[i]
      const edu = actualEducation[i]
      const institution = escapeLatex(edu.institution || '')
      const location = escapeLatex(edu.location || '')
      const dates = escapeLatex(edu.dates || '')
      const university = institution && location && dates
        ? `${institution} | ${location} \\hfill ${dates}`
        : institution || ''

      tex += `% Education ${i + 1}
\\newcommand{\\Edu${eduName}Degree}{${escapeLatex(edu.degree || '')}}
\\newcommand{\\Edu${eduName}Institution}{${institution}}
\\newcommand{\\Edu${eduName}Location}{${location}}
\\newcommand{\\Edu${eduName}Dates}{${dates}}
\\newcommand{\\Edu${eduName}GPA}{${escapeLatex(edu.gpa || '')}}
\\newcommand{\\Edu${eduName}University}{${university}}

`
    }
  } else {
    // Define minimal empty education to avoid LaTeX errors
    tex += `% No education
\\newcommand{\\EduOneDegree}{}
\\newcommand{\\EduOneInstitution}{}
\\newcommand{\\EduOneLocation}{}
\\newcommand{\\EduOneDates}{}
\\newcommand{\\EduOneGPA}{}
\\newcommand{\\EduOneUniversity}{}

`
  }

  // Add certifications - only if section is enabled and non-empty
  const actualCertifications = isSectionEnabled('certifications')
    ? certifications.filter((cert: string) => cert)
    : []
  for (let i = 0; i < Math.min(10, actualCertifications.length); i++) {
    const certName = expNames[i]
    tex += `\\newcommand{\\Certification${certName}}{${escapeLatex(actualCertifications[i])}}\n`
  }
  // Fill remaining certification slots with empty strings
  for (let i = actualCertifications.length; i < 10; i++) {
    const certName = expNames[i]
    tex += `\\newcommand{\\Certification${certName}}{}\n`
  }
  tex += '\n'

  // Add languages - only if section is enabled and non-empty
  const actualLanguages = isSectionEnabled('languages')
    ? languages.filter((lang: string) => lang)
    : []
  for (let i = 0; i < Math.min(10, actualLanguages.length); i++) {
    const langName = expNames[i]
    tex += `\\newcommand{\\Language${langName}}{${escapeLatex(actualLanguages[i])}}\n`
  }
  for (let i = actualLanguages.length; i < 10; i++) {
    const langName = expNames[i]
    tex += `\\newcommand{\\Language${langName}}{}\n`
  }
  tex += '\n'

  // Add awards - only if section is enabled and non-empty
  const actualAwards = isSectionEnabled('awards')
    ? awards.filter((award: string) => award)
    : []
  for (let i = 0; i < Math.min(10, actualAwards.length); i++) {
    const awardName = expNames[i]
    tex += `\\newcommand{\\Award${awardName}}{${escapeLatex(actualAwards[i])}}\n`
  }
  for (let i = actualAwards.length; i < 10; i++) {
    const awardName = expNames[i]
    tex += `\\newcommand{\\Award${awardName}}{}\n`
  }
  tex += '\n'

  // Add publications - only if section is enabled and non-empty
  const actualPublications = isSectionEnabled('publications')
    ? publications.filter((pub: string) => pub)
    : []
  for (let i = 0; i < Math.min(10, actualPublications.length); i++) {
    const pubName = expNames[i]
    tex += `\\newcommand{\\Publication${pubName}}{${escapeLatex(actualPublications[i])}}\n`
  }
  for (let i = actualPublications.length; i < 10; i++) {
    const pubName = expNames[i]
    tex += `\\newcommand{\\Publication${pubName}}{}\n`
  }
  tex += '\n'

  // Add extracurricular - only if section is enabled and non-empty
  const actualExtracurricular = isSectionEnabled('extracurricular')
    ? extracurricular.filter((extra: string) => extra)
    : []
  for (let i = 0; i < Math.min(10, actualExtracurricular.length); i++) {
    const extraName = expNames[i]
    tex += `\\newcommand{\\Extracurricular${extraName}}{${escapeLatex(actualExtracurricular[i])}}\n`
  }
  for (let i = actualExtracurricular.length; i < 10; i++) {
    const extraName = expNames[i]
    tex += `\\newcommand{\\Extracurricular${extraName}}{}\n`
  }
  tex += '\n'

  // Add volunteer - only if section is enabled and non-empty
  const actualVolunteer = isSectionEnabled('volunteer')
    ? volunteer.filter((vol: string) => vol)
    : []
  for (let i = 0; i < Math.min(10, actualVolunteer.length); i++) {
    const volName = expNames[i]
    tex += `\\newcommand{\\Volunteer${volName}}{${escapeLatex(actualVolunteer[i])}}\n`
  }
  for (let i = actualVolunteer.length; i < 10; i++) {
    const volName = expNames[i]
    tex += `\\newcommand{\\Volunteer${volName}}{}\n`
  }
  tex += '\n'

  // Add hobbies - only if section is enabled and non-empty
  const actualHobbies = isSectionEnabled('hobbies')
    ? hobbies.filter((hobby: string) => hobby)
    : []
  for (let i = 0; i < Math.min(10, actualHobbies.length); i++) {
    const hobbyName = expNames[i]
    tex += `\\newcommand{\\Hobby${hobbyName}}{${escapeLatex(actualHobbies[i])}}\n`
  }
  for (let i = actualHobbies.length; i < 10; i++) {
    const hobbyName = expNames[i]
    tex += `\\newcommand{\\Hobby${hobbyName}}{}\n`
  }

  return tex
}

