import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET all cover letter versions
export async function GET() {
  try {
    const versions = db.prepare(`
      SELECT id, company, version_name, created_at, updated_at 
      FROM cover_letter_versions 
      ORDER BY updated_at DESC
    `).all()

    return NextResponse.json(
      versions.map((v: any) => ({
        ...v,
        createdAt: new Date(v.created_at),
        updatedAt: new Date(v.updated_at)
      }))
    )
  } catch (error) {
    console.error('Error fetching cover letter versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cover letter versions' },
      { status: 500 }
    )
  }
}

// POST create/update cover letter version
export async function POST(request: NextRequest) {
  try {
    const { id, company, versionName, data } = await request.json()

    // Check if version exists
    const existing = db.prepare('SELECT id FROM cover_letter_versions WHERE id = ?').get(id)

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE cover_letter_versions 
        SET company = ?, version_name = ?, data = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(company, versionName, JSON.stringify(data), id)
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO cover_letter_versions (id, company, version_name, data)
        VALUES (?, ?, ?, ?)
      `).run(id, company, versionName, JSON.stringify(data))
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error saving cover letter version:', error)
    return NextResponse.json(
      { error: 'Failed to save cover letter version' },
      { status: 500 }
    )
  }
}

// DELETE cover letter version
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      )
    }

    db.prepare('DELETE FROM cover_letter_versions WHERE id = ?').run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cover letter version:', error)
    return NextResponse.json(
      { error: 'Failed to delete cover letter version' },
      { status: 500 }
    )
  }
}

