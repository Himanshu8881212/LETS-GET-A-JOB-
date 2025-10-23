import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { saveCoverLetterVersionSchema } from '@/lib/validation/schemas'
import {
  saveCoverLetterVersion,
  getAllCoverLetterVersions
} from '@/lib/services/document-service'
import { ZodError } from 'zod'

export const maxDuration = 10 // 10 seconds max

/**
 * GET /api/cover-letters - Get all saved cover letter versions
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const versions = getAllCoverLetterVersions(userId)

    // Parse JSON data for each version
    const versionsWithData = versions.map(v => ({
      ...v,
      data: JSON.parse(v.data_json),
      data_json: undefined
    }))

    return NextResponse.json(versionsWithData)
  } catch (error) {
    console.error('Error fetching cover letter versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cover letter versions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cover-letters - Save a new cover letter version
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const body = await request.json()

    // Validate input
    const validatedData = saveCoverLetterVersionSchema.parse(body)

    // Save cover letter version
    const version = await saveCoverLetterVersion(
      userId,
      validatedData.version_name,
      validatedData.data,
      {
        description: validatedData.description,
        tags: validatedData.tags,
        isFavorite: validatedData.is_favorite,
        jobApplicationId: validatedData.job_application_id
      }
    )

    return NextResponse.json({
      ...version,
      data: JSON.parse(version.data_json),
      data_json: undefined
    }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error saving cover letter version:', error)
    return NextResponse.json(
      { error: 'Failed to save cover letter version' },
      { status: 500 }
    )
  }
}

