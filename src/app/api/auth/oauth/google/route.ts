import { NextRequest, NextResponse } from 'next/server'
import { OAuthService } from '@/lib/auth/oauth'

export async function GET(request: NextRequest) {
  try {
    const authUrl = OAuthService.getGoogleAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    )
  }
}