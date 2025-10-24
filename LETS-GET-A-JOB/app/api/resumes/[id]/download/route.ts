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
    const version = getResumeVersion(userId, versionId)

    if (!version) {
      return NextResponse.json({ error: 'Resume version not found' }, { status: 404 })
    }

    // Generate filename from version name and version number
    const sanitizedName = version.version_name
      .replace(/[^a-zA-Z0-9-_\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase()
    const filename = `${sanitizedName}-${version.version_number}.pdf`

    // Check if PDF already exists
    if (version.pdf_path) {
      try {
        const pdfBuffer = await fs.readFile(version.pdf_path)
        return new NextResponse(pdfBuffer as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      } catch (error) {
        // PDF file not found, regenerating...
      }
    }

    // Generate PDF from data_json
    const resumeData = JSON.parse(version.data_json)

    // Use the existing PDF generation logic
    // IMPORTANT: Disable cache for version downloads to ensure we get the exact PDF for this version
    const response = await fetch(`${request.nextUrl.origin}/api/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'X-Disable-Cache': 'true'  // Disable cache for version downloads
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
        'Content-Disposition': `attachment; filename="${filename}"`
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

