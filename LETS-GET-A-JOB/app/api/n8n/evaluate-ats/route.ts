import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { resume_text, cover_letter_text, job_description } = await request.json()

    if (!resume_text || !cover_letter_text || !job_description) {
      return NextResponse.json(
        { error: 'Resume text, cover letter text, and job description are required' },
        { status: 400 }
      )
    }

    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { error: 'n8n webhook URL not configured' },
        { status: 500 }
      )
    }

    // Call n8n webhook
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resume_text,
        cover_letter_text,
        job_description,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('n8n webhook error:', errorText)
      return NextResponse.json(
        { error: 'Failed to evaluate' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

