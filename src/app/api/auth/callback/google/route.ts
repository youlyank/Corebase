import { NextRequest, NextResponse } from 'next/server'
import { OAuthService } from '@/lib/auth/oauth'
import { JWTService } from '@/lib/auth/jwt'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}?error=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}?error=No authorization code provided`
      )
    }

    // Get Google profile
    const profile = await OAuthService.getGoogleProfile(code)
    
    // Handle login/signup
    const user = await OAuthService.handleOAuthLogin(profile)

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(
      user.id,
      user.email,
      user.role
    )
    const refreshToken = JWTService.generateRefreshToken(
      user.id,
      user.email,
      user.role
    )

    // Create session
    await JWTService.createSession(user.id, accessToken, refreshToken)

    // Update last active
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    })

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.NEXTAUTH_URL}?login=success&accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}?error=${encodeURIComponent('Failed to authenticate with Google')}`
    )
  }
}