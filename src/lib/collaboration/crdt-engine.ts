/**
 * CRDT-based Real-time Collaboration Engine
 * Provides conflict-free collaborative editing with operational transformation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  permissions: UserPermissions;
}

export interface CursorPosition {
  fileId: string;
  line: number;
  column: number;
  visible: boolean;
}

export interface SelectionRange {
  fileId: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface UserPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
}

export interface CollaborationMessage {
  id: string;
  type: 'text' | 'system' | 'file_share' | 'code_snippet';
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CRDTOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  fileId: string;
  userId: string;
  timestamp: number;
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  vectorClock: VectorClock;
}

export interface VectorClock {
  [userId: string]: number;
}

export interface FileState {
  fileId: string;
  content: string;
  version: number;
  operations: CRDTOperation[];
  vectorClock: VectorClock;
  lastModified: Date;
  modifiedBy: string;
}

export interface CollaborationSession {
  id: string;
  projectId: string;
  name: string;
  users: Map<string, CollaborationUser>;
  files: Map<string, FileState>;
  messages: CollaborationMessage[];
  createdAt: Date;
  isActive: boolean;
}

class CRDTCollaborationEngine extends EventEmitter {
  private sessions: Map<string, CollaborationSession> = new Map();
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId
  private operationBuffer: Map<string, CRDTOperation[]> = new Map();
  private readonly BUFFER_FLUSH_INTERVAL = 100; // 100ms
  private readonly MAX_OPERATION_BUFFER = 1000;

  constructor() {
    super();
    this.startOperationBufferFlusher();
  }

  /**
   * Create a new collaboration session
   */
  createSession(projectId: string, name: string): CollaborationSession {
    const session: CollaborationSession = {
      id: uuidv4(),
      projectId,
      name,
      users: new Map(),
      files: new Map(),
      messages: [],
      createdAt: new Date(),
      isActive: true
    };

    this.sessions.set(session.id, session);
    this.emit('sessionCreated', session);
    
    return session;
  }

  /**
   * Join a collaboration session
   */
  async joinSession(
    sessionId: string,
    user: Omit<CollaborationUser, 'status' | 'lastSeen'>
  ): Promise<CollaborationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Remove user from previous session if exists
    const previousSessionId = this.userSessions.get(user.id);
    if (previousSessionId) {
      await this.leaveSession(user.id);
    }

    // Add user to session
    const collaborationUser: CollaborationUser = {
      ...user,
      status: 'online',
      lastSeen: new Date()
    };

    session.users.set(user.id, collaborationUser);
    this.userSessions.set(user.id, sessionId);

    // Initialize file states for user
    for (const [fileId, fileState] of session.files) {
      this.emit('fileStateSync', {
        sessionId,
        userId: user.id,
        fileId,
        content: fileState.content,
        version: fileState.version
      });
    }

    // Notify other users
    this.broadcastToSession(sessionId, {
      type: 'user_joined',
      user: collaborationUser,
      timestamp: new Date()
    }, user.id);

    this.emit('userJoinedSession', { sessionId, user: collaborationUser });
    return session;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(userId: string): Promise<void> {
    const sessionId = this.userSessions.get(userId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const user = session.users.get(userId);
    if (user) {
      user.status = 'offline';
      user.lastSeen = new Date();
      
      // Notify other users
      this.broadcastToSession(sessionId, {
        type: 'user_left',
        userId,
        userName: user.name,
        timestamp: new Date()
      }, userId);
    }

    session.users.delete(userId);
    this.userSessions.delete(userId);

    // Clean up session if empty
    if (session.users.size === 0) {
      session.isActive = false;
      this.emit('sessionEmpty', sessionId);
    }

    this.emit('userLeftSession', { sessionId, userId });
  }

  /**
   * Apply CRDT operation to file
   */
  async applyOperation(operation: CRDTOperation): Promise<void> {
    const sessionId = this.getUserSession(operation.userId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const fileState = session.files.get(operation.fileId);
    if (!fileState) {
      // Initialize file state if not exists
      session.files.set(operation.fileId, {
        fileId: operation.fileId,
        content: '',
        version: 0,
        operations: [],
        vectorClock: {},
        lastModified: new Date(),
        modifiedBy: operation.userId
      });
      return this.applyOperation(operation);
    }

    // Check if operation is already applied
    const isApplied = fileState.operations.some(op => op.id === operation.id);
    if (isApplied) return;

    // Transform operation against concurrent operations
    const transformedOp = this.transformOperation(operation, fileState);
    
    // Apply operation to content
    const newContent = this.applyOperationToContent(transformedOp, fileState.content);
    
    // Update file state
    fileState.content = newContent;
    fileState.version++;
    fileState.operations.push(transformedOp);
    fileState.lastModified = new Date();
    fileState.modifiedBy = operation.userId;

    // Update vector clock
    this.updateVectorClock(fileState.vectorClock, operation.userId);

    // Buffer operation for broadcasting
    this.bufferOperation(sessionId, transformedOp);

    // Emit local event
    this.emit('operationApplied', {
      sessionId,
      fileId: operation.fileId,
      operation: transformedOp,
      content: newContent,
      version: fileState.version
    });
  }

  /**
   * Update user cursor position
   */
  updateCursor(userId: string, cursor: CursorPosition): void {
    const sessionId = this.userSessions.get(userId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const user = session.users.get(userId);
    if (!user) return;

    user.cursor = cursor;

    // Broadcast to other users
    this.broadcastToSession(sessionId, {
      type: 'cursor_updated',
      userId,
      cursor,
      timestamp: new Date()
    }, userId);

    this.emit('cursorUpdated', { sessionId, userId, cursor });
  }

  /**
   * Update user selection
   */
  updateSelection(userId: string, selection: SelectionRange): void {
    const sessionId = this.userSessions.get(userId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const user = session.users.get(userId);
    if (!user) return;

    user.selection = selection;

    // Broadcast to other users
    this.broadcastToSession(sessionId, {
      type: 'selection_updated',
      userId,
      selection,
      timestamp: new Date()
    }, userId);

    this.emit('selectionUpdated', { sessionId, userId, selection });
  }

  /**
   * Send chat message
   */
  sendMessage(userId: string, content: string, type: CollaborationMessage['type'] = 'text'): void {
    const sessionId = this.userSessions.get(userId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const user = session.users.get(userId);
    if (!user) return;

    const message: CollaborationMessage = {
      id: uuidv4(),
      type,
      content,
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      timestamp: new Date()
    };

    session.messages.push(message);

    // Broadcast to all users in session
    this.broadcastToSession(sessionId, {
      type: 'message_received',
      message,
      timestamp: new Date()
    });

    this.emit('messageSent', { sessionId, message });
  }

  /**
   * Initialize file for collaboration
   */
  initializeFile(sessionId: string, fileId: string, content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const fileState: FileState = {
      fileId,
      content,
      version: 1,
      operations: [],
      vectorClock: {},
      lastModified: new Date(),
      modifiedBy: 'system'
    };

    session.files.set(fileId, fileState);

    // Notify all users
    this.broadcastToSession(sessionId, {
      type: 'file_initialized',
      fileId,
      content,
      version: 1,
      timestamp: new Date()
    });

    this.emit('fileInitialized', { sessionId, fileId, content });
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): CollaborationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get user's current session
   */
  getUserSession(userId: string): string | null {
    return this.userSessions.get(userId) || null;
  }

  /**
   * Get all active sessions for a project
   */
  getProjectSessions(projectId: string): CollaborationSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.projectId === projectId && session.isActive);
  }

  // Private helper methods
  private transformOperation(operation: CRDTOperation, fileState: FileState): CRDTOperation {
    // Find concurrent operations
    const concurrentOps = fileState.operations.filter(op => 
      this.isConcurrent(operation, op, fileState.vectorClock)
    );

    let transformedOp = { ...operation };
    
    // Transform against each concurrent operation
    for (const concurrentOp of concurrentOps) {
      transformedOp = this.transformPair(transformedOp, concurrentOp);
    }

    return transformedOp;
  }

  private isConcurrent(op1: CRDTOperation, op2: CRDTOperation, vectorClock: VectorClock): boolean {
    const time1 = vectorClock[op1.userId] || 0;
    const time2 = vectorClock[op2.userId] || 0;
    
    return op1.timestamp > time1 && op2.timestamp > time2;
  }

  private transformPair(op1: CRDTOperation, op2: CRDTOperation): CRDTOperation {
    // Simple operational transformation
    // In a production system, this would be more sophisticated
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return op1;
      } else {
        return {
          ...op1,
          position: op1.position + (op2.content?.length || 0)
        };
      }
    }
    
    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return op1;
      } else {
        return {
          ...op1,
          position: op1.position + (op2.content?.length || 0)
        };
      }
    }
    
    if (op1.type === 'insert' && op2.type === 'delete') {
      if (op1.position <= op2.position) {
        return op1;
      } else {
        return {
          ...op1,
          position: Math.max(op1.position - (op2.length || 0), op2.position)
        };
      }
    }
    
    return op1;
  }

  private applyOperationToContent(operation: CRDTOperation, content: string): string {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) + 
               (operation.content || '') + 
               content.slice(operation.position);
      
      case 'delete':
        return content.slice(0, operation.position) + 
               content.slice(operation.position + (operation.length || 0));
      
      case 'retain':
        return content;
      
      default:
        return content;
    }
  }

  private updateVectorClock(vectorClock: VectorClock, userId: string): void {
    vectorClock[userId] = (vectorClock[userId] || 0) + 1;
  }

  private bufferOperation(sessionId: string, operation: CRDTOperation): void {
    if (!this.operationBuffer.has(sessionId)) {
      this.operationBuffer.set(sessionId, []);
    }

    const buffer = this.operationBuffer.get(sessionId)!;
    buffer.push(operation);

    if (buffer.length >= this.MAX_OPERATION_BUFFER) {
      this.flushOperationBuffer(sessionId);
    }
  }

  private flushOperationBuffer(sessionId: string): void {
    const buffer = this.operationBuffer.get(sessionId);
    if (!buffer || buffer.length === 0) return;

    this.broadcastToSession(sessionId, {
      type: 'operations_batch',
      operations: buffer,
      timestamp: new Date()
    });

    buffer.length = 0;
  }

  private startOperationBufferFlusher(): void {
    setInterval(() => {
      for (const sessionId of this.operationBuffer.keys()) {
        this.flushOperationBuffer(sessionId);
      }
    }, this.BUFFER_FLUSH_INTERVAL);
  }

  private broadcastToSession(sessionId: string, data: any, excludeUserId?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const [userId, user] of session.users) {
      if (userId !== excludeUserId && user.status === 'online') {
        this.emit('broadcastToUser', { userId, sessionId, data });
      }
    }
  }
}

// Singleton instance
export const crdtCollaborationEngine = new CRDTCollaborationEngine();

export default CRDTCollaborationEngine;