import { NextResponse } from 'next/server'
import { runAgent } from '@/lib/services/agent/core'

export const runtime = 'nodejs'
export const maxDuration = 600

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.goal || typeof body.goal !== 'string') {
    return NextResponse.json({ error: 'goal is required' }, { status: 400 })
  }

  try {
    const result = await runAgent({
      goal: body.goal,
      history: Array.isArray(body.history) ? body.history : undefined,
      sessionId: body.sessionId,
      maxIterations: body.maxIterations,
      toolNames: Array.isArray(body.toolNames) ? body.toolNames : undefined,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('agent/run failed:', err)
    return NextResponse.json(
      { error: 'Agent run failed', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
