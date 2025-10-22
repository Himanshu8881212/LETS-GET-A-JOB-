import { NextResponse } from 'next/server'
import { demoResumeData } from '@/lib/demo-data'

export async function GET() {
  try {
    // Generate PDF using the existing resume generation endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(demoResumeData),
    })

    if (!response.ok) {
      throw new Error('Failed to generate demo resume')
    }

    const pdfBuffer = await response.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="demo-resume-sarah-chen.pdf"',
      },
    })
  } catch (error) {
    console.error('Error generating demo resume:', error)
    return NextResponse.json(
      { error: 'Failed to generate demo resume' },
      { status: 500 }
    )
  }
}

