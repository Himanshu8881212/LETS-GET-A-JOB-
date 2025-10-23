import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { coverLetterApiSchema } from '@/lib/validation/schemas'
import { ZodError } from 'zod'
import { getUserSession } from '@/lib/db/session'
import { pdfRateLimiter, getRateLimitError } from '@/lib/rate-limit'
import { generateHash, getCachedPDF, cachePDF } from '@/lib/pdf-cache'

const execAsync = promisify(exec)

// Escape special LaTeX characters
function escapeLatex(text: string): string {
  if (!text) return ''
  return text
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

// Generate dynamic main.tex for cover letter
function generateCoverLetterMainTex(data: any): string {
  const { personalInfo, recipient, content } = data

  const hasName = personalInfo?.firstName || personalInfo?.lastName
  const hasRecipient = recipient?.name || recipient?.company || recipient?.address
  const hasContent = content?.opening || content?.closing ||
    content?.bodyParagraphs?.some((p: string) => p && p.trim().length > 0)

  let mainTex = `\\documentclass[10pt,a4paper]{article}

% Include common files
\\input{../common/preamble.tex}
\\input{../common/layout.tex}
\\input{../common/macros.tex}

% Include cover letter data
\\input{../COVER_LETTER_DATA.tex}

\\begin{document}

`

  // Only include sections if they have data
  if (hasName) {
    mainTex += `\\input{sections/header.tex}\n\n`
  }

  if (hasRecipient) {
    mainTex += `\\input{sections/recipient.tex}\n\n`
  }

  if (hasContent) {
    mainTex += `\\input{sections/body.tex}\n\n`
  }

  if (hasName) {
    mainTex += `\\input{sections/signature.tex}\n`
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
      data = coverLetterApiSchema.parse(rawData)
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

    // Check cache first
    const dataHash = generateHash(data)
    const cachedPDF = await getCachedPDF(dataHash)

    if (cachedPDF) {
      return new NextResponse(cachedPDF as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=cover_letter.pdf',
          'X-Cache': 'HIT'
        }
      })
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

    // Generate COVER_LETTER_DATA.tex content
    const coverLetterData = generateCoverLetterDataTex(data)

    // Generate dynamic main.tex
    const mainTex = generateCoverLetterMainTex(data)

    // Write to files in current directory (LETS-GET-A-JOB)
    const dataFilePath = path.join(resolvedRoot, 'COVER_LETTER_DATA.tex')
    const mainFilePath = path.join(resolvedRoot, 'cover_letter', 'main.tex')

    await fs.writeFile(dataFilePath, coverLetterData)
    await fs.writeFile(mainFilePath, mainTex)

    // Compile PDF with security constraints
    try {
      await execAsync('make cover_letter', {
        cwd: resolvedRoot,
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB max buffer
      })
    } catch (compileError: any) {
      console.error('LaTeX compilation error:', compileError.stderr || compileError.message)
      return NextResponse.json(
        { error: 'PDF compilation failed. Please check your input.' },
        { status: 500 }
      )
    }

    // Read PDF
    const pdfPath = path.join(resolvedRoot, 'cover_letter.pdf')
    const pdfBuffer = await fs.readFile(pdfPath)

    // Cache the generated PDF
    await cachePDF(dataHash, pdfBuffer)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=cover_letter.pdf',
        'X-Cache': 'MISS'
      }
    })
  } catch (error: any) {
    console.error('Error generating cover letter:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate cover letter' },
      { status: 500 }
    )
  }
}

// Set maximum execution time for this route
export const maxDuration = 30 // 30 seconds

function generateCoverLetterDataTex(data: any): string {
  const { personalInfo, recipient, content } = data

  let tex = `% Cover Letter Data - Generated by Web App\n`

  // HEADER SECTION - Generate complete LaTeX (ATS-Friendly: Left-aligned)
  const hasName = personalInfo?.firstName || personalInfo?.lastName
  if (hasName) {
    tex += `% Header Section Content\n`
    tex += `\\def\\HeaderContent{%\n`
    tex += `  \\noindent\n`
    tex += `  {\\fontsize{14}{16}\\selectfont\\bfseries ${escapeLatex(personalInfo?.firstName || '')} ${escapeLatex(personalInfo?.lastName || '')}}\n`
    tex += `  \\par\n`
    tex += `  \\vspace{2pt}\n`
    tex += `  \n`
    tex += `  \\noindent\n`
    tex += `  {\\fontsize{10}{12}\\selectfont\n`

    // Contact line: Phone | Email
    const contactParts = []
    if (personalInfo?.phone) contactParts.push(escapeLatex(personalInfo.phone))
    if (personalInfo?.email) contactParts.push(escapeLatex(personalInfo.email))
    if (contactParts.length > 0) {
      tex += `    ${contactParts.join(' | ')}\n`
    }

    // Links line: LinkedIn | Address
    const linksParts = []
    if (personalInfo?.linkedin) linksParts.push(escapeLatex(personalInfo.linkedin))
    if (personalInfo?.address) linksParts.push(escapeLatex(personalInfo.address))
    if (linksParts.length > 0) {
      tex += `    \\\\[1pt]\n`
      tex += `    ${linksParts.join(' | ')}\n`
    }

    tex += `  }\n`
    tex += `  \\par\n`
    tex += `  \\vspace{10pt}\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\HeaderContent{}\n\n`
  }

  // RECIPIENT SECTION - Generate complete LaTeX
  const hasRecipient = recipient?.hiringManager || recipient?.company || recipient?.address || recipient?.city
  if (hasRecipient) {
    tex += `% Recipient Section Content\n`
    tex += `\\def\\RecipientContent{%\n`
    tex += `  \\noindent\n`
    tex += `  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n`
    tex += `  \\par\n`
    tex += `  \\vspace{10pt}\n`
    tex += `  \n`
    tex += `  \\noindent\n`
    if (recipient?.hiringManager) {
      tex += `  ${escapeLatex(recipient.hiringManager)} \\\\\n`
    }
    if (recipient?.company) {
      tex += `  ${escapeLatex(recipient.company)} \\\\\n`
    }
    if (recipient?.address) {
      tex += `  ${escapeLatex(recipient.address)} \\\\\n`
    }
    if (recipient?.city) {
      tex += `  ${escapeLatex(recipient.city)}\n`
    }
    tex += `  \\par\n`
    tex += `  \\vspace{10pt}\n`
    tex += `  \n`
    tex += `  \\noindent\n`
    tex += `  Dear ${escapeLatex(recipient?.hiringManager || 'Hiring Manager')},\n`
    tex += `  \\par\n`
    tex += `  \\vspace{8pt}\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\RecipientContent{}\n\n`
  }

  // BODY SECTION - Generate complete LaTeX
  const hasContent = content?.opening || content?.closing ||
    (content?.bodyParagraphs && content.bodyParagraphs.some((p: string) => p && p.trim()))

  if (hasContent) {
    tex += `% Body Section Content\n`
    tex += `\\def\\BodyContent{%\n`

    // Opening paragraph
    if (content?.opening) {
      tex += `  \\noindent\n`
      tex += `  ${escapeLatex(content.opening)}\n`
      tex += `  \\par\n`
      tex += `  \\vspace{8pt}\n`
      tex += `  \n`
    }

    // Body paragraphs
    const actualBodyParagraphs = (content?.bodyParagraphs || []).filter((p: string) => p && p.trim())
    for (const paragraph of actualBodyParagraphs) {
      tex += `  \\noindent\n`
      tex += `  ${escapeLatex(paragraph)}\n`
      tex += `  \\par\n`
      tex += `  \\vspace{8pt}\n`
      tex += `  \n`
    }

    // Closing paragraph
    if (content?.closing) {
      tex += `  \\noindent\n`
      tex += `  ${escapeLatex(content.closing)}\n`
      tex += `  \\par\n`
    }

    tex += `}\n\n`
  } else {
    tex += `\\def\\BodyContent{}\n\n`
  }

  // SIGNATURE SECTION - Generate complete LaTeX
  if (hasName) {
    tex += `% Signature Section Content\n`
    tex += `\\def\\SignatureContent{%\n`
    tex += `  \\vspace{10pt}\n`
    tex += `  \n`
    tex += `  \\noindent\n`
    tex += `  Sincerely,\n`
    tex += `  \\par\n`
    tex += `  \\vspace{8pt}\n`
    tex += `  \n`
    tex += `  \\noindent\n`
    tex += `  ${escapeLatex(personalInfo?.firstName || '')} ${escapeLatex(personalInfo?.lastName || '')}\n`
    tex += `}\n\n`
  } else {
    tex += `\\def\\SignatureContent{}\n\n`
  }

  return tex
}

