import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export interface CollabRoom {
  id: string
  doc: Y.Doc
  users: Map<string, any>
  createdAt: Date
  lastActivity: Date
}

export class CollabServer {
  private io: SocketIOServer
  private rooms: Map<string, CollabRoom> = new Map()
  private documentRoom: Map<string, Y.Doc> = new Map()

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })
    
    this.setupSocketHandlers()
    this.startCleanupInterval()
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`)

      // Join a collaborative room
      socket.on('join-room', (data: { roomId: string, userId: string, userName: string }) => {
        const { roomId, userId, userName } = data
        
        // Get or create room
        let room = this.rooms.get(roomId)
        if (!room) {
          const doc = new Y.Doc()
          room = {
            id: roomId,
            doc,
            users: new Map(),
            createdAt: new Date(),
            lastActivity: new Date()
          }
          this.rooms.set(roomId, room)
          this.documentRoom.set(roomId, doc)
        }

        // Join socket room
        socket.join(roomId)
        
        // Add user to room
        room.users.set(userId, {
          id: userId,
          name: userName,
          socketId: socket.id,
          cursor: { line: 0, ch: 0 },
          color: this.getRandomColor()
        })
        
        room.lastActivity = new Date()

        // Send current document state
        const state = Y.encodeStateAsUpdate(room.doc)
        socket.emit('document-state', {
          state: Array.from(state),
          users: Array.from(room.users.values())
        })

        // Notify others
        socket.to(roomId).emit('user-joined', {
          userId,
          userName,
          users: Array.from(room.users.values())
        })

        console.log(`User ${userName} joined room ${roomId}`)
      })

      // Handle document updates
      socket.on('document-update', (data: { roomId: string, update: number[], userId: string }) => {
        const { roomId, update, userId } = data
        const room = this.rooms.get(roomId)
        
        if (room) {
          const yUpdate = new Uint8Array(update)
          Y.applyUpdate(room.doc, yUpdate)
          
          // Broadcast to others in room
          socket.to(roomId).emit('document-update', {
            update: Array.from(yUpdate),
            userId
          })
          
          room.lastActivity = new Date()
        }
      })

      // Handle cursor updates
      socket.on('cursor-update', (data: { roomId: string, userId: string, cursor: { line: number, ch: number } }) => {
        const { roomId, userId, cursor } = data
        const room = this.rooms.get(roomId)
        
        if (room) {
          const user = room.users.get(userId)
          if (user) {
            user.cursor = cursor
            room.lastActivity = new Date()
            
            // Broadcast to others
            socket.to(roomId).emit('cursor-update', {
              userId,
              cursor
            })
          }
        }
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`)
        
        // Find and remove user from all rooms
        for (const [roomId, room] of this.rooms.entries()) {
          let userRemoved = false
          for (const [userId, user] of room.users.entries()) {
            if (user.socketId === socket.id) {
              room.users.delete(userId)
              userRemoved = true
              
              // Notify others
              socket.to(roomId).emit('user-left', {
                userId,
                users: Array.from(room.users.values())
              })
              
              console.log(`User ${user.name} left room ${roomId}`)
              break
            }
          }
          
          // Clean up empty rooms
          if (userRemoved && room.users.size === 0) {
            setTimeout(() => {
              if (room.users.size === 0) {
                this.rooms.delete(roomId)
                this.documentRoom.delete(roomId)
                console.log(`Cleaned up empty room: ${roomId}`)
              }
            }, 30000) // Clean up after 30 seconds
          }
        }
      })
    })
  }

  private getRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private startCleanupInterval() {
    setInterval(() => {
      const now = new Date()
      for (const [roomId, room] of this.rooms.entries()) {
        // Clean up rooms inactive for more than 1 hour
        if (now.getTime() - room.lastActivity.getTime() > 3600000) {
          this.rooms.delete(roomId)
          this.documentRoom.delete(roomId)
          console.log(`Cleaned up inactive room: ${roomId}`)
        }
      }
    }, 300000) // Check every 5 minutes
  }

  // Get room info for API
  public getRoomInfo(roomId: string): CollabRoom | null {
    return this.rooms.get(roomId) || null
  }

  // Get all active rooms
  public getAllRooms(): CollabRoom[] {
    return Array.from(this.rooms.values())
  }

  // Get server stats
  public getStats() {
    return {
      totalRooms: this.rooms.size,
      totalUsers: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.users.size, 0),
      uptime: process.uptime()
    }
  }
}

// Singleton instance
let collabServer: CollabServer | null = null

export function initializeCollabServer(httpServer: HTTPServer): CollabServer {
  if (!collabServer) {
    collabServer = new CollabServer(httpServer)
    console.log('Collaboration server initialized')
  }
  return collabServer
}

export function getCollabServer(): CollabServer | null {
  return collabServer
}