import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { getAllCoverLetterVersions } from '@/lib/services/document-service'

export const maxDuration = 10

export async function GET(_request: NextRequest) {
  try {
    const userId = await getUserSession()
    const rows = getAllCoverLetterVersions(userId)

    const versions = rows.map(v => ({
      id: v.id,
      version: (v as any).version_number || 'v1.0',
      name: v.version_name,
      created_at: v.created_at,
    }))

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching cover letter versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cover letter versions' },
      { status: 500 }
    )
  }
}
