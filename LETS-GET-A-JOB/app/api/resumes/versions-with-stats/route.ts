import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { getAllResumeVersionsWithStats } from '@/lib/services/resume-stats-service'

export const maxDuration = 10 // 10 seconds max

/**
 * GET /api/resumes/versions-with-stats - Get all resume versions with statistics
 */
export async function GET() {
  try {
    const userId = await getUserSession()
    const versions = getAllResumeVersionsWithStats(userId)

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching resume versions with stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch resume versions' },
      { status: 500 }
    )
  }
}

