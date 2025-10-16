import { NextRequest, NextResponse } from 'next/server'
import { getCollabServer } from '@/lib/collab/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    
    const collabServer = getCollabServer()
    
    if (!collabServer) {
      return NextResponse.json({
        status: 'error',
        message: 'Collaboration server not initialized'
      }, { status: 503 })
    }

    // Get server stats
    const stats = collabServer.getStats()
    
    // If roomId is provided, get room-specific info
    let roomInfo = null
    if (roomId) {
      roomInfo = collabServer.getRoomInfo(roomId)
      if (roomInfo) {
        roomInfo = {
          id: roomInfo.id,
          userCount: roomInfo.users.size,
          users: Array.from(roomInfo.users.values()).map(user => ({
            id: user.id,
            name: user.name,
            cursor: user.cursor,
            color: user.color
          })),
          createdAt: roomInfo.createdAt,
          lastActivity: roomInfo.lastActivity
        }
      }
    }

    // Get all rooms (limited info)
    const allRooms = collabServer.getAllRooms().map(room => ({
      id: room.id,
      userCount: room.users.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity
    }))

    return NextResponse.json({
      status: 'success',
      server: {
        ...stats,
        uptime: Math.floor(stats.uptime)
      },
      rooms: allRooms,
      room: roomInfo,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Collab API error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, roomId, userId, userName } = body

    const collabServer = getCollabServer()
    
    if (!collabServer) {
      return NextResponse.json({
        status: 'error',
        message: 'Collaboration server not initialized'
      }, { status: 503 })
    }

    switch (action) {
      case 'create-room':
        if (!roomId) {
          return NextResponse.json({
            status: 'error',
            message: 'Room ID is required'
          }, { status: 400 })
        }
        
        const roomInfo = collabServer.getRoomInfo(roomId)
        if (roomInfo) {
          return NextResponse.json({
            status: 'success',
            message: 'Room already exists',
            room: {
              id: roomInfo.id,
              userCount: roomInfo.users.size
            }
          })
        } else {
          return NextResponse.json({
            status: 'success',
            message: 'Room created successfully',
            room: {
              id: roomId,
              userCount: 0
            }
          })
        }

      case 'validate-room':
        if (!roomId) {
          return NextResponse.json({
            status: 'error',
            message: 'Room ID is required'
          }, { status: 400 })
        }
        
        const existingRoom = collabServer.getRoomInfo(roomId)
        return NextResponse.json({
          status: 'success',
          exists: !!existingRoom,
          room: existingRoom ? {
            id: existingRoom.id,
            userCount: existingRoom.users.size
          } : null
        })

      default:
        return NextResponse.json({
          status: 'error',
          message: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Collab POST API error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}