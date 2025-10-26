import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jobUrl } = await request.json()

    if (!jobUrl) {
      return NextResponse.json(
        { error: 'Job URL is required' },
        { status: 400 }
      )
    }

    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_JD_WEBHOOK_URL

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
      body: JSON.stringify({ jobUrl }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[process-jd] n8n webhook error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      return NextResponse.json(
        { error: 'Failed to process job description', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[process-jd] API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

