import { db } from "@/lib/db";

export interface CollaborationSession {
  id: string;
  projectId: string;
  userId: string;
  containerId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActiveAt: Date;
  cursor?: {
    line: number;
    column: number;
    filePath: string;
  };
  permissions: string[];
}

export interface SharedContainer {
  id: string;
  projectId: string;
  containerId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  maxUsers: number;
  currentUsers: number;
  settings: {
    allowTerminal: boolean;
    allowFileEdit: boolean;
    allowCursorTracking: boolean;
    autoSave: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class CollaborationManager {
  private activeSessions = new Map<string, CollaborationSession[]>();
  private sharedContainers = new Map<string, SharedContainer>();

  /**
   * Create a shared container for collaboration
   */
  async createSharedContainer(data: {
    projectId: string;
    containerId: string;
    name: string;
    description?: string;
    isPublic?: boolean;
    maxUsers?: number;
    settings?: Partial<SharedContainer['settings']>;
  }): Promise<SharedContainer> {
    const sharedContainer: SharedContainer = {
      id: `shared-${Date.now()}`,
      projectId: data.projectId,
      containerId: data.containerId,
      name: data.name,
      description: data.description,
      isPublic: data.isPublic ?? false,
      maxUsers: data.maxUsers ?? 5,
      currentUsers: 0,
      settings: {
        allowTerminal: true,
        allowFileEdit: true,
        allowCursorTracking: true,
        autoSave: true,
        ...data.settings
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    await db.collaborationSession.create({
      data: {
        projectId: data.projectId,
        containerId: data.containerId,
        userId: 'system', // Creator will be added separately
        role: 'owner',
        permissions: ['read', 'write', 'admin']
      }
    });

    this.sharedContainers.set(sharedContainer.id, sharedContainer);
    return sharedContainer;
  }

  /**
   * Join a collaboration session
   */
  async joinSession(sessionId: string, userId: string, role: CollaborationSession['role'] = 'editor'): Promise<CollaborationSession> {
    const sharedContainer = this.sharedContainers.get(sessionId);
    if (!sharedContainer) {
      throw new Error('Session not found');
    }

    if (sharedContainer.currentUsers >= sharedContainer.maxUsers) {
      throw new Error('Session is full');
    }

    const session: CollaborationSession = {
      id: `session-${userId}-${Date.now()}`,
      projectId: sharedContainer.projectId,
      userId,
      containerId: sharedContainer.containerId,
      role,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      permissions: this.getPermissionsForRole(role)
    };

    // Save to database
    await db.collaborationSession.create({
      data: {
        projectId: sharedContainer.projectId,
        containerId: sharedContainer.containerId,
        userId,
        role,
        permissions: session.permissions
      }
    });

    // Update active sessions
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, []);
    }
    this.activeSessions.get(sessionId)!.push(session);

    // Update user count
    sharedContainer.currentUsers++;
    sharedContainer.updatedAt = new Date();

    return session;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const sessions = this.activeSessions.get(sessionId);
    if (!sessions) return;

    const sessionIndex = sessions.findIndex(s => s.userId === userId);
    if (sessionIndex === -1) return;

    const session = sessions[sessionIndex];
    sessions.splice(sessionIndex, 1);

    // Remove from database
    await db.collaborationSession.deleteMany({
      where: {
        userId,
        containerId: session.containerId
      }
    });

    // Update shared container user count
    const sharedContainer = this.sharedContainers.get(sessionId);
    if (sharedContainer) {
      sharedContainer.currentUsers = Math.max(0, sharedContainer.currentUsers - 1);
      sharedContainer.updatedAt = new Date();
    }

    // Clean up empty sessions
    if (sessions.length === 0) {
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Update user cursor position
   */
  async updateCursor(sessionId: string, userId: string, cursor: CollaborationSession['cursor']): Promise<void> {
    const sessions = this.activeSessions.get(sessionId);
    if (!sessions) return;

    const session = sessions.find(s => s.userId === userId);
    if (!session) return;

    session.cursor = cursor;
    session.lastActiveAt = new Date();

    // Broadcast cursor update to other users
    this.broadcastCursorUpdate(sessionId, userId, cursor);
  }

  /**
   * Get active users in a session
   */
  getActiveUsers(sessionId: string): CollaborationSession[] {
    return this.activeSessions.get(sessionId) || [];
  }

  /**
   * Get shared container info
   */
  getSharedContainer(sessionId: string): SharedContainer | undefined {
    return this.sharedContainers.get(sessionId);
  }

  /**
   * Get all shared containers for a project
   */
  getProjectSharedContainers(projectId: string): SharedContainer[] {
    return Array.from(this.sharedContainers.values())
      .filter(container => container.projectId === projectId);
  }

  /**
   * Check if user has permission for action
   */
  hasPermission(sessionId: string, userId: string, action: string): boolean {
    const sessions = this.activeSessions.get(sessionId);
    if (!sessions) return false;

    const session = sessions.find(s => s.userId === userId);
    if (!session) return false;

    return session.permissions.includes(action);
  }

  private getPermissionsForRole(role: CollaborationSession['role']): string[] {
    switch (role) {
      case 'owner':
        return ['read', 'write', 'admin', 'terminal', 'share'];
      case 'editor':
        return ['read', 'write', 'terminal'];
      case 'viewer':
        return ['read'];
      default:
        return [];
    }
  }

  private broadcastCursorUpdate(sessionId: string, userId: string, cursor: CollaborationSession['cursor']): void {
    // This would be implemented with Socket.IO or WebSocket
    // For now, we'll just log it
    console.log(`Cursor update broadcast: ${sessionId} - User ${userId} at line ${cursor?.line}, col ${cursor?.column}`);
  }

  /**
   * Clean up inactive sessions
   */
  async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, sessions] of this.activeSessions.entries()) {
      const activeSessions = sessions.filter(session => 
        now.getTime() - session.lastActiveAt.getTime() < inactiveThreshold
      );

      if (activeSessions.length !== sessions.length) {
        this.activeSessions.set(sessionId, activeSessions);
        
        // Update shared container user count
        const sharedContainer = this.sharedContainers.get(sessionId);
        if (sharedContainer) {
          sharedContainer.currentUsers = activeSessions.length;
          sharedContainer.updatedAt = new Date();
        }
      }
    }
  }
}

// Singleton instance
export const collaborationManager = new CollaborationManager();