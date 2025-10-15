import { NextRequest, NextResponse } from 'next/server'
import { JWTService } from './jwt'
import { RedisService } from '@/lib/redis'
import { db } from '@/lib/db'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

export async function authenticateToken(request: NextRequest): Promise<NextResponse | null> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify JWT token
    const decoded = JWTService.verifyAccessToken(token)
    
    // Check if session exists in Redis
    const session = await RedisService.getSession(token)
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Get fresh user data
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true
      }
    })

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Update last active time
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    })

    // Add user to request for downstream handlers
    ;(request as any).user = {
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase()
    }

    return null // Continue processing
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const authResult = await authenticateToken(request)
    
    if (authResult) {
      return authResult
    }

    const user = (request as any).user
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return null // Continue processing
  }
}

export function requireAdmin() {
  return requireRole(['admin', 'super_admin'])
}

export function requireModerator() {
  return requireRole(['moderator', 'admin', 'super_admin'])
}

// Rate limiting middleware
export async function rateLimit(
  request: NextRequest,
  limit: number = 100,
  window: number = 60 // seconds
): Promise<NextResponse | null> {
  const identifier = request.ip || 'unknown'
  
  const allowed = await RedisService.checkRateLimit(identifier, limit, window)
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  return null // Continue processing
}