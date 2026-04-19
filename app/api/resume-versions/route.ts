import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { getAllResumeVersions } from '@/lib/services/document-service'

export const maxDuration = 10

export async function GET(_request: NextRequest) {
  try {
    const userId = await getUserSession()
    const rows = getAllResumeVersions(userId)

    const versions = rows.map(v => ({
      id: v.id,
      version: v.version_number,
      name: v.version_name,
      created_at: v.created_at,
    }))

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching resume versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume versions' },
      { status: 500 }
    )
  }
}
