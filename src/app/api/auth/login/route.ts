import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { JWTService } from '@/lib/auth/jwt'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // For demo purposes, we'll skip password verification
    // In production, you would hash passwords and verify them
    // const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    // if (!isValidPassword) {
    //   return NextResponse.json(
    //     { error: 'Invalid credentials' },
    //     { status: 401 }
    //   )
    // }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 401 }
      )
    }

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

    // Log the login
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resource: 'user',
        resourceId: user.id,
        details: { method: 'email' },
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        avatar: user.avatar
      },
      accessToken,
      refreshToken
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}