import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/oauth/providers'
import { deleteOAuthToken } from '@/lib/oauth/storage'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: { provider: string } }
) {
  const provider = getProvider(params.provider)
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${params.provider}` }, { status: 404 })
  }
  const ok = deleteOAuthToken(provider.key)
  return NextResponse.json({ ok, provider: provider.key })
}
