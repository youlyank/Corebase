import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const providers = [
      {
        id: 'email',
        name: 'Email/Password',
        description: 'Traditional authentication with email and password',
        icon: 'email',
        enabled: true,
        config: {
          requireEmailVerification: true,
          passwordMinLength: 8,
          allowSignUp: true
        }
      },
      {
        id: 'google',
        name: 'Google',
        description: 'OAuth authentication with Google',
        icon: 'google',
        enabled: true,
        config: {
          clientId: 'your-google-client-id.apps.googleusercontent.com',
          clientSecret: '***hidden***'
        }
      },
      {
        id: 'github',
        name: 'GitHub',
        description: 'OAuth authentication with GitHub',
        icon: 'github',
        enabled: false,
        config: {
          clientId: 'your-github-client-id',
          clientSecret: '***hidden***'
        }
      }
    ]

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Error fetching auth providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerId, config } = body

    // Simulate updating provider configuration
    return NextResponse.json({ 
      message: `Provider ${providerId} updated successfully`,
      provider: {
        id: providerId,
        config
      }
    })
  } catch (error) {
    console.error('Error updating auth provider:', error)
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    )
  }
}