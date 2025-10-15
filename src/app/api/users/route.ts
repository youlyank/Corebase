import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UserRole, UserStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const role = searchParams.get('role') as UserRole | null
    const status = searchParams.get('status') as UserStatus | null

    // Build where clause
    const where: any = {}
    if (role) where.role = role
    if (status) where.status = status

    // Fetch users from database
    const users = await db.user.findMany({
      where,
      include: {
        _count: {
          select: {
            files: true,
            projects: true,
            apiKeys: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const total = await db.user.count({ where })

    // Transform users to match expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
      lastActive: user.lastActiveAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
      stats: {
        files: user._count.files,
        projects: user._count.projects,
        apiKeys: user._count.apiKeys
      }
    }))

    return NextResponse.json({
      users: transformedUsers,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role = 'USER' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // Create new user
    const newUser = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        role: role.toUpperCase() as UserRole,
        status: UserStatus.ACTIVE
      }
    })

    // Transform to match expected format
    const transformedUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role.toLowerCase(),
      status: newUser.status.toLowerCase(),
      lastActive: newUser.lastActiveAt?.toISOString() || null,
      createdAt: newUser.createdAt.toISOString(),
      avatar: newUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.email}`,
      stats: {
        files: 0,
        projects: 0,
        apiKeys: 0
      }
    }

    return NextResponse.json({
      user: transformedUser,
      message: 'User created successfully'
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}