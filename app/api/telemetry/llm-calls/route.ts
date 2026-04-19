import { NextResponse } from 'next/server'
import { listLlmCalls, summarize } from '@/lib/llm/telemetry'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit') || 50)
  const offset = Number(url.searchParams.get('offset') || 0)
  const feature = url.searchParams.get('feature') || undefined
  const errorsOnly = url.searchParams.get('errors') === '1'

  try {
    const { total, rows } = listLlmCalls({ limit, offset, feature: feature as any, errorsOnly })
    return NextResponse.json({
      summary: summarize(),
      total,
      rows,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
