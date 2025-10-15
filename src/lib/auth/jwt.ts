import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
const JWT_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  type: 'access' | 'refresh'
}

export class JWTService {
  static generateAccessToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      {
        userId,
        email,
        role,
        type: 'access'
      } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
  }

  static generateRefreshToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      {
        userId,
        email,
        role,
        type: 'refresh'
      } as JWTPayload,
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    )
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type')
      }
      return decoded
    } catch (error) {
      throw new Error('Invalid access token')
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }
      return decoded
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  static async createSession(userId: string, accessToken: string, refreshToken: string) {
    // Store session in database
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    const session = await db.session.create({
      data: {
        userId,
        token: accessToken,
        refreshToken,
        expiresAt
      }
    })

    return session
  }

  static async refreshSession(refreshToken: string) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken)
      
      // Find the session
      const session = await db.session.findFirst({
        where: {
          refreshToken,
          userId: decoded.userId
        },
        include: {
          user: true
        }
      })

      if (!session || session.expiresAt < new Date()) {
        throw new Error('Session expired or not found')
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(
        session.user.id,
        session.user.email,
        session.user.role
      )
      const newRefreshToken = this.generateRefreshToken(
        session.user.id,
        session.user.email,
        session.user.role
      )

      // Update session
      await db.session.update({
        where: { id: session.id },
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken,
          updatedAt: new Date()
        }
      })

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role
        }
      }
    } catch (error) {
      throw new Error('Failed to refresh session')
    }
  }

  static async revokeSession(token: string) {
    try {
      const decoded = this.verifyAccessToken(token)
      
      await db.session.deleteMany({
        where: {
          userId: decoded.userId,
          token
        }
      })

      return true
    } catch (error) {
      throw new Error('Failed to revoke session')
    }
  }

  static async revokeAllSessions(userId: string) {
    await db.session.deleteMany({
      where: { userId }
    })
    return true
  }
}