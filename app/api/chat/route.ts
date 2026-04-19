import { NextResponse } from 'next/server'
import { runScoutAgent } from '@/lib/services/ai/scout'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  try {
    const result = await runScoutAgent({
      message: body.message,
      sessionId: body.sessionId || 'default',
      history: Array.isArray(body.history) ? body.history : [],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    })
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || String(err)
    // Config-related errors get a 428 + friendly hint so the UI can nudge
    // the user to Settings rather than showing a scary 500.
    if (/No (model|API key) configured|Signed out of/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Scout needs a model configured',
          detail: msg,
          hint: 'Open Settings and either sign in with ChatGPT / Google, or pick OpenRouter / Ollama / LM Studio.',
        },
        { status: 428 }
      )
    }
    console.error('chat failed:', err)
    return NextResponse.json(
      { error: 'Scout is unavailable', detail: msg },
      { status: 500 }
    )
  }
}
