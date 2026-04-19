import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/oauth/providers'
import { getOAuthToken } from '@/lib/oauth/storage'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: { provider: string } }
) {
  const provider = getProvider(params.provider)
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${params.provider}` }, { status: 404 })
  }
  const token = getOAuthToken(provider.key)
  if (!token) {
    return NextResponse.json({ signedIn: false, provider: provider.key })
  }
  return NextResponse.json({
    signedIn: true,
    provider: provider.key,
    displayName: provider.displayName,
    accountEmail: token.accountEmail,
    accountName: token.accountName,
    expiresAt: token.expiresAt,
    scope: token.scope,
  })
}
