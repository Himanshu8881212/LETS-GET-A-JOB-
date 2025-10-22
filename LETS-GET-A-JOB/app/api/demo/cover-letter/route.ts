import { NextResponse } from 'next/server'
import { demoCoverLetterData } from '@/lib/demo-data'

export async function GET() {
  try {
    // Generate PDF using the existing cover letter generation endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/generate-cover-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(demoCoverLetterData),
    })

    if (!response.ok) {
      throw new Error('Failed to generate demo cover letter')
    }

    const pdfBuffer = await response.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="demo-cover-letter-sarah-chen.pdf"',
      },
    })
  } catch (error) {
    console.error('Error generating demo cover letter:', error)
    return NextResponse.json(
      { error: 'Failed to generate demo cover letter' },
      { status: 500 }
    )
  }
}

