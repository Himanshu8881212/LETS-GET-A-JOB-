import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import getDatabase from '@/lib/db'
import { getUserSession } from '@/lib/db/session'

const evalInsertSchema = z.object({
  job_url: z.string().url().nullish(),
  job_description_text: z.string().min(10).max(40_000),
  resume_text: z.string().min(10).max(40_000),
  cover_letter_text: z.string().max(40_000),
  resume_version_id: z.number().int().nullish(),
  cover_letter_version_id: z.number().int().nullish(),
  job_application_id: z.number().int().nullish(),
})

const evalUpdateSchema = z.object({
  evaluation_id: z.number().int(),
  evaluation_result: z.unknown(),
  overall_score: z.number().min(0).max(100).nullish(),
})

/**
 * POST /api/ats-evaluations
 * Save processed data (job description, resume, cover letter) to database
 * Returns the evaluation ID to be used for the final evaluation
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const body = await request.json()

    const parsed = evalInsertSchema.parse(body)
    const {
      job_url,
      job_description_text,
      resume_text,
      cover_letter_text,
      resume_version_id,
      cover_letter_version_id,
      job_application_id,
    } = parsed

    const db = getDatabase()

    // Insert evaluation data
    const result = db.prepare(`
      INSERT INTO ats_evaluations (
        user_id,
        job_url,
        job_description_text,
        resume_text,
        cover_letter_text,
        resume_version_id,
        cover_letter_version_id,
        job_application_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      job_url || null,
      job_description_text,
      resume_text,
      cover_letter_text,
      resume_version_id || null,
      cover_letter_version_id || null,
      job_application_id || null
    )

    const evaluationId = result.lastInsertRowid as number

    return NextResponse.json({
      success: true,
      evaluation_id: evaluationId,
      message: 'Evaluation data saved successfully'
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }
    console.error('Error saving evaluation data:', error)
    return NextResponse.json(
      { error: 'Failed to save evaluation data' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/ats-evaluations/:id
 * Update evaluation with results from the AI evaluation
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const body = await request.json()

    const { evaluation_id, evaluation_result, overall_score } = evalUpdateSchema.parse(body)

    const db = getDatabase()

    // Update evaluation with results
    const result = db.prepare(`
      UPDATE ats_evaluations
      SET 
        evaluation_result = ?,
        overall_score = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      JSON.stringify(evaluation_result),
      overall_score || null,
      evaluation_id,
      userId
    )

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Evaluation not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Evaluation results saved successfully'
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }
    console.error('Error updating evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to update evaluation' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/ats-evaluations
 * Get all evaluations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const db = getDatabase()

    // Get query parameter to determine if we need full data or just list
    const { searchParams } = new URL(request.url)
    const includeFullData = searchParams.get('full') === 'true'

    let evaluations

    if (includeFullData) {
      // Return full data including texts and evaluation results
      evaluations = db.prepare(`
        SELECT
          id,
          job_url,
          job_description_text,
          resume_text,
          cover_letter_text,
          evaluation_result,
          overall_score,
          resume_version_id,
          cover_letter_version_id,
          job_application_id,
          created_at,
          updated_at
        FROM ats_evaluations
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(userId)
    } else {
      // Return minimal data for list view (including job_description_text for name extraction and custom_name)
      evaluations = db.prepare(`
        SELECT
          id,
          job_url,
          job_description_text,
          custom_name,
          overall_score,
          resume_version_id,
          cover_letter_version_id,
          job_application_id,
          created_at,
          updated_at
        FROM ats_evaluations
        WHERE user_id = ? AND evaluation_result IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 50
      `).all(userId)
    }

    return NextResponse.json({
      success: true,
      evaluations
    })
  } catch (error) {
    console.error('Error fetching evaluations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluations' },
      { status: 500 }
    )
  }
}

