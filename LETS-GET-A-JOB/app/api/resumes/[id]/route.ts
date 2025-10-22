import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { updateResumeVersionSchema } from '@/lib/validation/schemas'
import {
  getResumeVersion,
  updateResumeVersion,
  deleteResumeVersion
} from '@/lib/services/document-service'
import { ZodError } from 'zod'

/**
 * GET /api/resumes/[id] - Get a single resume version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const versionId = parseInt(id, 10)
    
    if (isNaN(versionId)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      )
    }
    
    const version = getResumeVersion(userId, versionId)
    
    if (!version) {
      return NextResponse.json(
        { error: 'Resume version not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      ...version,
      data: JSON.parse(version.data_json),
      data_json: undefined
    })
  } catch (error) {
    console.error('Error fetching resume version:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume version' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/resumes/[id] - Update resume version metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const versionId = parseInt(id, 10)
    
    if (isNaN(versionId)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const validatedData = updateResumeVersionSchema.parse(body)
    
    const version = await updateResumeVersion(userId, versionId, validatedData)
    
    if (!version) {
      return NextResponse.json(
        { error: 'Resume version not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      ...version,
      data: JSON.parse(version.data_json),
      data_json: undefined
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating resume version:', error)
    return NextResponse.json(
      { error: 'Failed to update resume version' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/resumes/[id] - Delete a resume version
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const versionId = parseInt(id, 10)
    
    if (isNaN(versionId)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      )
    }
    
    const success = await deleteResumeVersion(userId, versionId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Resume version not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resume version:', error)
    return NextResponse.json(
      { error: 'Failed to delete resume version' },
      { status: 500 }
    )
  }
}

