import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { getVersionLineage } from '@/lib/services/cover-letter-stats-service'

export const maxDuration = 10 // 10 seconds max

/**
 * GET /api/cover-letters/lineage - Get cover letter version lineage (tree structure)
 */
export async function GET() {
  try {
    const userId = await getUserSession()
    const lineage = getVersionLineage(userId)

    return NextResponse.json(lineage)
  } catch (error) {
    console.error('Error fetching cover letter lineage:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cover letter lineage' },
      { status: 500 }
    )
  }
}

