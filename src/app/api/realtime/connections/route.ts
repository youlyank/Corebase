import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Simulate realtime connection data
    const connections = {
      activeConnections: 24,
      messagesPerSecond: 142,
      connectedTables: [
        {
          name: 'users',
          listeners: 8,
          lastActivity: '2024-01-15T10:30:00Z',
          events: ['INSERT', 'UPDATE', 'DELETE']
        },
        {
          name: 'posts',
          listeners: 12,
          lastActivity: '2024-01-15T10:29:45Z',
          events: ['INSERT', 'UPDATE', 'DELETE']
        },
        {
          name: 'comments',
          listeners: 4,
          lastActivity: '2024-01-15T10:28:30Z',
          events: ['INSERT', 'UPDATE', 'DELETE']
        }
      ],
      recentEvents: [
        {
          id: '1',
          table: 'users',
          event: 'INSERT',
          data: { id: '123', email: 'newuser@example.com' },
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          table: 'posts',
          event: 'UPDATE',
          data: { id: '456', title: 'Updated Post Title' },
          timestamp: '2024-01-15T10:29:45Z'
        },
        {
          id: '3',
          table: 'comments',
          event: 'DELETE',
          data: { id: '789' },
          timestamp: '2024-01-15T10:28:30Z'
        }
      ]
    }

    return NextResponse.json(connections)
  } catch (error) {
    console.error('Error fetching realtime connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}