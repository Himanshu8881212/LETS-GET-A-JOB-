import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { getCoverLetterVersion } from '@/lib/services/cover-letter-service'
import fs from 'fs/promises'

export const maxDuration = 30 // 30 seconds max for PDF generation

/**
 * GET /api/cover-letters/[id]/download - Download a specific cover letter version as PDF
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

    // Get the cover letter version
    const version = getCoverLetterVersion(userId, versionId)

    if (!version) {
      return NextResponse.json({ error: 'Cover letter version not found' }, { status: 404 })
    }

    // Check if PDF already exists
    if (version.pdf_path) {
      try {
        const pdfBuffer = await fs.readFile(version.pdf_path)
        return new NextResponse(pdfBuffer as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=cover-letter-${version.version_number}.pdf`
          }
        })
      } catch (error) {
        console.log('PDF file not found, regenerating...')
      }
    }

    // Generate PDF from data_json
    const coverLetterData = JSON.parse(version.data_json)

    // DEBUG: Log the opening paragraph to verify correct data
    console.log(`[DOWNLOAD v${version.version_number}] Opening paragraph:`, coverLetterData.openingParagraph?.substring(0, 100))

    // Transform data to match the API schema
    const apiData = {
      personalInfo: coverLetterData.personalInfo,
      recipient: coverLetterData.recipientInfo,
      content: {
        opening: coverLetterData.openingParagraph,
        bodyParagraphs: coverLetterData.bodyParagraphs,
        closing: coverLetterData.closingParagraph
      }
    }

    // Use the existing PDF generation logic
    // IMPORTANT: Disable cache for version downloads to ensure we get the exact PDF for this version
    const response = await fetch(`${request.nextUrl.origin}/api/generate-cover-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'X-Disable-Cache': 'true'  // Disable cache for version downloads
      },
      body: JSON.stringify(apiData)
    })

    if (!response.ok) {
      throw new Error('Failed to generate PDF')
    }

    const pdfBuffer = await response.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=cover-letter-${version.version_number}.pdf`
      }
    })
  } catch (error) {
    console.error('Error downloading cover letter:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download cover letter' },
      { status: 500 }
    )
  }
}

