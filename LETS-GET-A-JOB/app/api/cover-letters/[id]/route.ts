import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { updateCoverLetterVersionSchema } from '@/lib/validation/schemas'
import {
  getCoverLetterVersion,
  deleteCoverLetterVersion
} from '@/lib/services/document-service'
import { ZodError } from 'zod'
import { getDatabase } from '@/lib/db/index'

/**
 * GET /api/cover-letters/[id] - Get a single cover letter version
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

    const version = getCoverLetterVersion(userId, versionId)

    if (!version) {
      return NextResponse.json(
        { error: 'Cover letter version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...version,
      data: JSON.parse(version.data_json),
      data_json: undefined
    })
  } catch (error) {
    console.error('Error fetching cover letter version:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cover letter version' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/cover-letters/[id] - Update cover letter version metadata
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
    const validatedData = updateCoverLetterVersionSchema.parse(body)

    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (validatedData.version_name !== undefined) {
      fields.push('version_name = ?')
      values.push(validatedData.version_name)
    }
    if (validatedData.description !== undefined) {
      fields.push('description = ?')
      values.push(validatedData.description || null)
    }
    if (validatedData.tags !== undefined) {
      fields.push('tags = ?')
      values.push(validatedData.tags || null)
    }
    if (validatedData.is_favorite !== undefined) {
      fields.push('is_favorite = ?')
      values.push(validatedData.is_favorite ? 1 : 0)
    }
    if (validatedData.job_application_id !== undefined) {
      fields.push('job_application_id = ?')
      values.push(validatedData.job_application_id || null)
    }

    if (fields.length > 0) {
      values.push(versionId, userId)

      const result = db.prepare(`
        UPDATE cover_letter_versions
        SET ${fields.join(', ')}
        WHERE id = ? AND user_id = ?
      `).run(...values)

      if (result.changes === 0) {
        return NextResponse.json(
          { error: 'Cover letter version not found' },
          { status: 404 }
        )
      }
    }

    const version = getCoverLetterVersion(userId, versionId)

    return NextResponse.json({
      ...version,
      data: JSON.parse(version!.data_json),
      data_json: undefined
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating cover letter version:', error)
    return NextResponse.json(
      { error: 'Failed to update cover letter version' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cover-letters/[id] - Delete a cover letter version
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

    const success = await deleteCoverLetterVersion(userId, versionId)

    if (!success) {
      return NextResponse.json(
        { error: 'Cover letter version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cover letter version:', error)
    return NextResponse.json(
      { error: 'Failed to delete cover letter version' },
      { status: 500 }
    )
  }
}

