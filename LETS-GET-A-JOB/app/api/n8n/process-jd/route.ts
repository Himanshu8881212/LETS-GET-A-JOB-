import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jobUrl } = await request.json()
    console.log('🔍 [process-jd] Received request with jobUrl:', jobUrl)

    if (!jobUrl) {
      console.error('❌ [process-jd] No jobUrl provided')
      return NextResponse.json(
        { error: 'Job URL is required' },
        { status: 400 }
      )
    }

    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_JD_WEBHOOK_URL
    console.log('🔗 [process-jd] n8n webhook URL:', n8nWebhookUrl)

    if (!n8nWebhookUrl) {
      console.error('❌ [process-jd] n8n webhook URL not configured')
      return NextResponse.json(
        { error: 'n8n webhook URL not configured' },
        { status: 500 }
      )
    }

    // Call n8n webhook
    console.log('📤 [process-jd] Calling n8n webhook...')
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobUrl }),
    })

    console.log('📥 [process-jd] n8n response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [process-jd] n8n webhook error:', {
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
    console.log('✅ [process-jd] n8n response data:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ [process-jd] API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

