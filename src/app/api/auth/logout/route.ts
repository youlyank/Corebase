import { NextRequest, NextResponse } from 'next/server'
import { JWTService } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    await JWTService.revokeSession(token)

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}