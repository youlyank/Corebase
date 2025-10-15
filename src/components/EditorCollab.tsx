"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Wifi, WifiOff, Loader2, User } from 'lucide-react'
import { createCollabClient, CollabClient, CollabUser } from '@/lib/collab/client'

interface EditorCollabProps {
  roomId: string
  userId: string
  userName: string
  initialContent?: string
  onContentChange?: (content: string) => void
  className?: string
}

export function EditorCollab({
  roomId,
  userId,
  userName,
  initialContent = '',
  onContentChange,
  className = ''
}: EditorCollabProps) {
  const [content, setContent] = useState(initialContent)
  const [users, setUsers] = useState<CollabUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [cursors, setCursors] = useState<Map<string, { line: number; ch: number }>>(new Map())
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const clientRef = useRef<CollabClient | null>(null)

  // Initialize collaboration client
  useEffect(() => {
    const client = createCollabClient({
      roomId,
      userId,
      userName,
      serverUrl: window.location.origin
    })

    // Set up event handlers
    client.on('users-update', (updatedUsers) => {
      setUsers(updatedUsers)
    })

    client.on('document-update', (newContent) => {
      setContent(newContent)
      onContentChange?.(newContent)
    })

    client.on('cursor-update', (userId, cursor) => {
      setCursors(prev => new Map(prev.set(userId, cursor)))
    })

    client.on('connection-change', (connected) => {
      setIsConnected(connected)
      setIsLoading(false)
    })

    // Connect to server
    client.connect()
    clientRef.current = client

    // Set initial content if provided
    if (initialContent) {
      client.replaceText(0, 0, initialContent)
    }

    return () => {
      client.destroy()
    }
  }, [roomId, userId, userName, initialContent, onContentChange])

  // Handle text changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const client = clientRef.current
    
    if (!client) return

    // Calculate the difference
    const oldContent = content
    const cursorPos = e.target.selectionStart
    
    if (newContent.length > oldContent.length) {
      // Text was added
      const addedText = newContent.substring(oldContent.length)
      client.insertText(oldContent.length, addedText)
    } else if (newContent.length < oldContent.length) {
      // Text was removed
      const removedLength = oldContent.length - newContent.length
      client.deleteText(newContent.length, removedLength)
    } else {
      // Text was replaced (complex case)
      client.replaceText(0, oldContent.length, newContent)
    }

    setContent(newContent)
    onContentChange?.(newContent)
  }, [content, onContentChange])

  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    const textarea = textareaRef.current
    const client = clientRef.current
    
    if (!textarea || !client) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = textarea.value.substring(0, cursorPos)
    const lines = textBeforeCursor.split('\n')
    const line = lines.length - 1
    const ch = lines[lines.length - 1].length

    client.updateCursor({ line, ch })
  }, [])

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    handleCursorChange()
  }, [handleCursorChange])

  // Add selection change listeners
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.addEventListener('select', handleSelectionChange)
    textarea.addEventListener('keyup', handleSelectionChange)
    textarea.addEventListener('click', handleSelectionChange)

    return () => {
      textarea.removeEventListener('select', handleSelectionChange)
      textarea.removeEventListener('keyup', handleSelectionChange)
      textarea.removeEventListener('click', handleSelectionChange)
    }
  }, [handleSelectionChange])

  const currentUser = users.find(u => u.id === userId)
  const otherUsers = users.filter(u => u.id !== userId)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              Collaborative Editor
            </CardTitle>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Active Users ({users.length})</span>
            </div>
            <div className="text-sm text-gray-500">
              Room: {roomId}
            </div>
          </div>

          {/* Users List */}
          <div className="flex flex-wrap gap-2 mb-4">
            {currentUser && (
              <Badge 
                key={currentUser.id} 
                variant="outline" 
                style={{ borderColor: currentUser.color, color: currentUser.color }}
              >
                <User className="w-3 h-3 mr-1" />
                {currentUser.name} (You)
              </Badge>
            )}
            {otherUsers.map(user => (
              <Badge 
                key={user.id} 
                variant="outline" 
                style={{ borderColor: user.color, color: user.color }}
              >
                <User className="w-3 h-3 mr-1" />
                {user.name}
                {cursors.has(user.id) && (
                  <span className="ml-1 text-xs">
                    L:{cursors.get(user.id)!.line + 1}
                  </span>
                )}
              </Badge>
            ))}
          </div>

          {/* Editor */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              className="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Start collaborating..."
              disabled={!isConnected}
            />
            
            {/* Connection Overlay */}
            {!isConnected && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <WifiOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Connecting to collaboration server...</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div>
              {content.length} characters • {content.split('\n').length} lines
            </div>
            <div>
              {isConnected ? 'Real-time sync active' : 'Offline mode'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}