import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()

    // Get the first cover letter from the database (any user)
    const firstCoverLetter = db.prepare(`
      SELECT id, version_name, version_number, data_json
      FROM cover_letter_versions
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as any

    if (!firstCoverLetter) {
      return NextResponse.json(
        { error: 'No cover letter samples available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: firstCoverLetter.id,
      version_name: firstCoverLetter.version_name,
      version_number: firstCoverLetter.version_number,
      data: JSON.parse(firstCoverLetter.data_json)
    })
  } catch (error) {
    console.error('Error fetching sample cover letter:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sample cover letter' },
      { status: 500 }
    )
  }
}

