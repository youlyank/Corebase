import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'

export interface CollabUser {
  id: string
  name: string
  socketId: string
  cursor: { line: number; ch: number }
  color: string
}

export interface CollabClientOptions {
  roomId: string
  userId: string
  userName: string
  serverUrl?: string
}

export class CollabClient {
  private socket: Socket
  private doc: Y.Doc
  private text: Y.Text
  private roomId: string
  private userId: string
  private userName: string
  private users: Map<string, CollabUser> = new Map()
  private isConnected = false

  // Event callbacks
  private onUsersUpdate?: (users: CollabUser[]) => void
  private onDocumentUpdate?: (text: string) => void
  private onCursorUpdate?: (userId: string, cursor: { line: number; ch: number }) => void
  private onConnectionChange?: (connected: boolean) => void

  constructor(options: CollabClientOptions) {
    const { roomId, userId, userName, serverUrl = 'http://localhost:3000' } = options
    
    this.roomId = roomId
    this.userId = userId
    this.userName = userName
    
    // Initialize Yjs document
    this.doc = new Y.Doc()
    this.text = this.doc.getText('content')
    
    // Initialize Socket.IO client
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    })
    
    this.setupSocketHandlers()
    this.setupDocumentHandlers()
  }

  private setupSocketHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to collaboration server')
      this.isConnected = true
      this.onConnectionChange?.(true)
      
      // Join room
      this.socket.emit('join-room', {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName
      })
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server')
      this.isConnected = false
      this.onConnectionChange?.(false)
    })

    this.socket.on('document-state', (data: { state: number[], users: CollabUser[] }) => {
      // Apply document state
      const update = new Uint8Array(data.state)
      Y.applyUpdate(this.doc, update)
      
      // Update users
      this.updateUsers(data.users)
    })

    this.socket.on('document-update', (data: { update: number[], userId: string }) => {
      // Apply document update
      const update = new Uint8Array(data.update)
      Y.applyUpdate(this.doc, update)
    })

    this.socket.on('user-joined', (data: { userId: string, userName: string, users: CollabUser[] }) => {
      console.log(`User ${data.userName} joined the room`)
      this.updateUsers(data.users)
    })

    this.socket.on('user-left', (data: { userId: string, users: CollabUser[] }) => {
      console.log(`User ${data.userId} left the room`)
      this.updateUsers(data.users)
    })

    this.socket.on('cursor-update', (data: { userId: string, cursor: { line: number; ch: number } }) => {
      this.onCursorUpdate?.(data.userId, data.cursor)
    })
  }

  private setupDocumentHandlers() {
    this.text.observe((event) => {
      if (event.origin === this.socket) return // Ignore our own changes
      this.onDocumentUpdate?.(this.text.toString())
    })
  }

  private updateUsers(users: CollabUser[]) {
    this.users.clear()
    users.forEach(user => {
      this.users.set(user.id, user)
    })
    this.onUsersUpdate?.(Array.from(this.users.values()))
  }

  // Public methods
  public connect() {
    if (!this.isConnected) {
      this.socket.connect()
    }
  }

  public disconnect() {
    this.socket.disconnect()
  }

  public insertText(index: number, text: string) {
    this.text.insert(index, text)
    this.broadcastUpdate()
  }

  public deleteText(index: number, length: number) {
    this.text.delete(index, length)
    this.broadcastUpdate()
  }

  public replaceText(index: number, length: number, text: string) {
    this.text.delete(index, length)
    this.text.insert(index, text)
    this.broadcastUpdate()
  }

  public getDocument(): string {
    return this.text.toString()
  }

  public getUsers(): CollabUser[] {
    return Array.from(this.users.values())
  }

  public updateCursor(cursor: { line: number; ch: number }) {
    if (this.isConnected) {
      this.socket.emit('cursor-update', {
        roomId: this.roomId,
        userId: this.userId,
        cursor
      })
    }
  }

  private broadcastUpdate() {
    if (this.isConnected) {
      const update = Y.encodeStateAsUpdate(this.doc)
      this.socket.emit('document-update', {
        roomId: this.roomId,
        update: Array.from(update),
        userId: this.userId
      })
    }
  }

  // Event handlers
  public on(event: 'users-update', callback: (users: CollabUser[]) => void): void
  public on(event: 'document-update', callback: (text: string) => void): void
  public on(event: 'cursor-update', callback: (userId: string, cursor: { line: number; ch: number }) => void): void
  public on(event: 'connection-change', callback: (connected: boolean) => void): void
  public on(event: string, callback: any): void {
    switch (event) {
      case 'users-update':
        this.onUsersUpdate = callback
        break
      case 'document-update':
        this.onDocumentUpdate = callback
        break
      case 'cursor-update':
        this.onCursorUpdate = callback
        break
      case 'connection-change':
        this.onConnectionChange = callback
        break
    }
  }

  public off(event: string): void {
    switch (event) {
      case 'users-update':
        this.onUsersUpdate = undefined
        break
      case 'document-update':
        this.onDocumentUpdate = undefined
        break
      case 'cursor-update':
        this.onCursorUpdate = undefined
        break
      case 'connection-change':
        this.onConnectionChange = undefined
        break
    }
  }

  // Utility methods
  public isConnectedToServer(): boolean {
    return this.isConnected
  }

  public getRoomId(): string {
    return this.roomId
  }

  public getUserId(): string {
    return this.userId
  }

  public getUserName(): string {
    return this.userName
  }

  public destroy() {
    this.disconnect()
    this.doc.destroy()
  }
}

// Helper function to create a client
export function createCollabClient(options: CollabClientOptions): CollabClient {
  return new CollabClient(options)
}