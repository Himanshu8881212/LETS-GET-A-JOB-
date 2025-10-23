import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { getResumeVersion } from '@/lib/services/document-service'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const maxDuration = 30 // 30 seconds max for PDF generation

/**
 * GET /api/resumes/[id]/download - Download a specific resume version as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const versionId = parseInt(id)

    if (isNaN(versionId)) {
      return NextResponse.json({ error: 'Invalid version ID' }, { status: 400 })
    }

    // Get the resume version
    const version = getResumeVersion(versionId, userId)

    if (!version) {
      return NextResponse.json({ error: 'Resume version not found' }, { status: 404 })
    }

    // Check if PDF already exists
    if (version.pdf_path) {
      try {
        const pdfBuffer = await fs.readFile(version.pdf_path)
        return new NextResponse(pdfBuffer as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=resume-${version.version_number}.pdf`
          }
        })
      } catch (error) {
        console.log('PDF file not found, regenerating...')
      }
    }

    // Generate PDF from data_json
    const resumeData = JSON.parse(version.data_json)

    // Use the existing PDF generation logic
    const response = await fetch(`${request.nextUrl.origin}/api/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify(resumeData)
    })

    if (!response.ok) {
      throw new Error('Failed to generate PDF')
    }

    const pdfBuffer = await response.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=resume-${version.version_number}.pdf`
      }
    })
  } catch (error) {
    console.error('Error downloading resume:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download resume' },
      { status: 500 }
    )
  }
}

