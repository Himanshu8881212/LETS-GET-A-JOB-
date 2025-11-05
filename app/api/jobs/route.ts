import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { jobApplicationSchema } from '@/lib/validation/schemas'
import {
  createJobApplication,
  getAllJobApplications,
  getJobApplicationsByStatus,
  getJobStatistics
} from '@/lib/services/job-service'
import { ZodError } from 'zod'

export const maxDuration = 10 // 10 seconds max

/**
 * GET /api/jobs - Get all job applications or filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const stats = searchParams.get('stats')

    if (stats === 'true') {
      const statistics = getJobStatistics(userId)
      return NextResponse.json(statistics)
    }

    const jobs = status
      ? getJobApplicationsByStatus(userId, status)
      : getAllJobApplications(userId)

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job applications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/jobs - Create a new job application
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserSession()
    const body = await request.json()

    // Validate input
    const validatedData = jobApplicationSchema.parse(body)

    // Create job application
    const job = await createJobApplication(userId, validatedData)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job application' },
      { status: 500 }
    )
  }
}
