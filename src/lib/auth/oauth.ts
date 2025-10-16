import { db } from '@/lib/db'
import { ProviderName } from '@prisma/client'

export interface OAuthProfile {
  id: string
  email: string
  name?: string
  avatar?: string
  provider: ProviderName
}

export class OAuthService {
  static async handleOAuthLogin(profile: OAuthProfile) {
    try {
      // Check if user exists with this OAuth provider
      let user = await db.user.findFirst({
        where: {
          email: profile.email
        }
      })

      if (!user) {
        // Create new user
        user = await db.user.create({
          data: {
            email: profile.email,
            name: profile.name || profile.email.split('@')[0],
            avatar: profile.avatar,
            role: 'USER',
            status: 'ACTIVE',
            emailVerified: true // OAuth users are pre-verified
          }
        })

        // Log the signup
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'SIGNUP',
            resource: 'user',
            resourceId: user.id,
            details: {
              provider: profile.provider,
              method: 'oauth'
            }
          }
        })
      } else {
        // Update user info if needed
        if (!user.avatar && profile.avatar) {
          await db.user.update({
            where: { id: user.id },
            data: { avatar: profile.avatar }
          })
        }
        
        if (!user.emailVerified) {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: true }
          })
        }
      }

      // Log the login
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          resource: 'user',
          resourceId: user.id,
          details: {
            provider: profile.provider,
            method: 'oauth'
          }
        }
      })

      return user
    } catch (error) {
      console.error('OAuth login error:', error)
      throw new Error('Failed to handle OAuth login')
    }
  }

  static getGoogleAuthUrl() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    const scope = 'openid email profile'
    
    if (!clientId) {
      throw new Error('Google client ID not configured')
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  static async getGoogleProfile(code: string): Promise<OAuthProfile> {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth not configured')
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token')
      }

      // Get user profile
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      const profileData = await profileResponse.json()

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile')
      }

      return {
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        avatar: profileData.picture,
        provider: 'GOOGLE'
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
      throw new Error('Failed to authenticate with Google')
    }
  }

  static getGitHubAuthUrl() {
    const clientId = process.env.GITHUB_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/github`
    const scope = 'user:email'
    
    if (!clientId) {
      throw new Error('GitHub client ID not configured')
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      response_type: 'code'
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  static async getGitHubProfile(code: string): Promise<OAuthProfile> {
    try {
      const clientId = process.env.GITHUB_CLIENT_ID
      const clientSecret = process.env.GITHUB_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        throw new Error('GitHub OAuth not configured')
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      })

      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error('Failed to exchange code for token')
      }

      // Get user profile
      const profileResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      const profileData = await profileResponse.json()

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile')
      }

      // Get user email (GitHub requires separate API call for email)
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      const emailData = await emailResponse.json()
      const primaryEmail = emailData.find((email: any) => email.primary)?.email

      if (!primaryEmail) {
        throw new Error('No primary email found')
      }

      return {
        id: profileData.id.toString(),
        email: primaryEmail,
        name: profileData.name,
        avatar: profileData.avatar_url,
        provider: 'GITHUB'
      }
    } catch (error) {
      console.error('GitHub OAuth error:', error)
      throw new Error('Failed to authenticate with GitHub')
    }
  }
}