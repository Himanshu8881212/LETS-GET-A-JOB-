import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { saveResumeVersionSchema } from '@/lib/validation/schemas'
import {
  saveResumeVersion,
  getAllResumeVersions
} from '@/lib/services/document-service'
import { ZodError } from 'zod'

/**
 * GET /api/resumes - Get all saved resume versions
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const versions = getAllResumeVersions(userId)
    
    // Parse JSON data for each version
    const versionsWithData = versions.map(v => ({
      ...v,
      data: JSON.parse(v.data_json),
      data_json: undefined // Remove raw JSON from response
    }))
    
    return NextResponse.json(versionsWithData)
  } catch (error) {
    console.error('Error fetching resume versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume versions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/resumes - Save a new resume version
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const body = await request.json()
    
    // Validate input
    const validatedData = saveResumeVersionSchema.parse(body)
    
    // Save resume version
    const version = await saveResumeVersion(
      userId,
      validatedData.version_name,
      validatedData.data,
      {
        description: validatedData.description,
        tags: validatedData.tags,
        isFavorite: validatedData.is_favorite
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
    
    console.error('Error saving resume version:', error)
    return NextResponse.json(
      { error: 'Failed to save resume version' },
      { status: 500 }
    )
  }
}

