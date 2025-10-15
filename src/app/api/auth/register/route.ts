import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { JWTService } from '@/lib/auth/jwt'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password (skipped for demo)
    // const passwordHash = await bcrypt.hash(password, 12)

    // Create new user
    const newUser = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        // passwordHash, // Add this field to schema in production
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: false // In production, you'd send a verification email
      }
    })

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(
      newUser.id,
      newUser.email,
      newUser.role
    )
    const refreshToken = JWTService.generateRefreshToken(
      newUser.id,
      newUser.email,
      newUser.role
    )

    // Create session
    await JWTService.createSession(newUser.id, accessToken, refreshToken)

    // Log the signup
    await db.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'SIGNUP',
        resource: 'user',
        resourceId: newUser.id,
        details: { method: 'email' },
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role.toLowerCase(),
        avatar: newUser.avatar,
        emailVerified: newUser.emailVerified
      },
      accessToken,
      refreshToken,
      message: 'User registered successfully'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}