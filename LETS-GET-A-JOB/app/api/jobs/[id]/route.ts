import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { updateJobApplicationSchema } from '@/lib/validation/schemas'
import {
  getJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getJobStatusHistory
} from '@/lib/services/job-service'
import { ZodError } from 'zod'

/**
 * GET /api/jobs/[id] - Get a single job application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const jobId = parseInt(id, 10)
    
    if (isNaN(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('history') === 'true'
    
    const job = getJobApplication(userId, jobId)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job application not found' },
        { status: 404 }
      )
    }
    
    if (includeHistory) {
      const history = getJobStatusHistory(userId, jobId)
      return NextResponse.json({ ...job, statusHistory: history })
    }
    
    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job application' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/jobs/[id] - Update a job application
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const jobId = parseInt(id, 10)
    
    if (isNaN(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    // Validate input
    const validatedData = updateJobApplicationSchema.parse(body)
    
    // Update job application
    const job = await updateJobApplication(userId, jobId, validatedData)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job application not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(job)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job application' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/[id] - Delete a job application
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const jobId = parseInt(id, 10)
    
    if (isNaN(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      )
    }
    
    const success = await deleteJobApplication(userId, jobId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Job application not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job application' },
      { status: 500 }
    )
  }
}

