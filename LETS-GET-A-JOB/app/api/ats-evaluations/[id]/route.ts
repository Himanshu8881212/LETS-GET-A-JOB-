import { NextRequest, NextResponse } from 'next/server'
import getDatabase from '@/lib/db'
import { getUserSession } from '@/lib/db/session'

/**
 * GET /api/ats-evaluations/:id
 * Get a specific evaluation by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await context.params
    const evaluationId = parseInt(id)

    if (isNaN(evaluationId)) {
      return NextResponse.json(
        { error: 'Invalid evaluation ID' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    const evaluation = db.prepare(`
      SELECT *
      FROM ats_evaluations
      WHERE id = ? AND user_id = ?
    `).get(evaluationId, userId)

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    // Parse evaluation_result JSON if it exists
    const result = evaluation as any
    if (result.evaluation_result) {
      try {
        result.evaluation_result = JSON.parse(result.evaluation_result)
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    return NextResponse.json({
      success: true,
      evaluation: result
    })
  } catch (error) {
    console.error('Error fetching evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ats-evaluations/:id
 * Update evaluation (rename)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await context.params
    const evaluationId = parseInt(id)
    const body = await request.json()

    if (isNaN(evaluationId)) {
      return NextResponse.json(
        { error: 'Invalid evaluation ID' },
        { status: 400 }
      )
    }

    const { custom_name } = body

    const db = getDatabase()

    const result = db.prepare(`
      UPDATE ats_evaluations
      SET custom_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(custom_name || null, evaluationId, userId)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Evaluation not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Evaluation updated successfully'
    })
  } catch (error) {
    console.error('Error updating evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to update evaluation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ats-evaluations/:id
 * Delete an evaluation
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await context.params
    const evaluationId = parseInt(id)

    if (isNaN(evaluationId)) {
      return NextResponse.json(
        { error: 'Invalid evaluation ID' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    const result = db.prepare(`
      DELETE FROM ats_evaluations
      WHERE id = ? AND user_id = ?
    `).run(evaluationId, userId)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Evaluation not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Evaluation deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to delete evaluation' },
      { status: 500 }
    )
  }
}
