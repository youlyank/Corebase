import { Server as NetServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";
import { collaborationManager, CollaborationSession } from "@/lib/collaboration/manager";
import { publish } from "@/lib/events/bus";

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: NetServer & {
    server: ServerIO;
  };
}

export interface SocketData {
  userId: string;
  projectId: string;
  sessionId?: string;
  role?: string;
}

export interface CollaborationEvents {
  'session:join': (data: { sessionId: string; role?: string }) => void;
  'session:leave': () => void;
  'cursor:update': (data: { line: number; column: number; filePath: string }) => void;
  'editor:change': (data: { filePath: string; content: string; changes: any }) => void;
  'terminal:input': (data: { command: string }) => void;
  'terminal:output': (data: { output: string }) => void;
  'user:typing': (data: { filePath: string; isTyping: boolean }) => void;
  'user:presence': (data: { status: 'online' | 'away' | 'offline' }) => void;
}

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('User connected to collaboration socket:', socket.id);

      // Authentication middleware
      socket.use(async (packet, next) => {
        try {
          const token = socket.handshake.auth.token;
          if (!token) {
            return next(new Error('Authentication required'));
          }

          // Verify token and get user info
          const userData = await verifyToken(token);
          socket.data = {
            userId: userData.userId,
            projectId: userData.projectId,
            sessionId: userData.sessionId,
            role: userData.role
          };
          
          next();
        } catch (error) {
          next(new Error('Authentication failed'));
        }
      });

      // Join collaboration session
      socket.on('session:join', async (data: { sessionId: string; role?: string }) => {
        try {
          const { userId, projectId } = socket.data;
          const { sessionId, role = 'editor' } = data;

          // Join session
          const session = await collaborationManager.joinSession(sessionId, userId, role as any);
          
          // Update socket data
          socket.data.sessionId = sessionId;
          socket.data.role = role;

          // Join socket room
          socket.join(sessionId);

          // Get active users
          const activeUsers = collaborationManager.getActiveUsers(sessionId);
          const sharedContainer = collaborationManager.getSharedContainer(sessionId);

          // Send session info to user
          socket.emit('session:joined', {
            session,
            activeUsers,
            sharedContainer
          });

          // Notify other users
          socket.to(sessionId).emit('user:joined', {
            user: session,
            activeUsers: activeUsers.filter(u => u.userId !== userId)
          });

          // Publish event to bus
          await publish(`project:${projectId}`, {
            type: 'collaboration.user_joined',
            projectId,
            data: {
              sessionId,
              userId,
              role,
              activeUsers: activeUsers.length
            }
          });

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Leave collaboration session
      socket.on('session:leave', async () => {
        try {
          const { userId, sessionId, projectId } = socket.data;
          
          if (sessionId) {
            await collaborationManager.leaveSession(sessionId, userId);
            
            // Leave socket room
            socket.leave(sessionId);

            // Notify other users
            socket.to(sessionId).emit('user:left', {
              userId,
              activeUsers: collaborationManager.getActiveUsers(sessionId)
            });

            // Publish event to bus
            await publish(`project:${projectId}`, {
              type: 'collaboration.user_left',
              projectId,
              data: {
                sessionId,
                userId,
                activeUsers: collaborationManager.getActiveUsers(sessionId).length
              }
            });
          }

          // Clear socket data
          socket.data.sessionId = undefined;
          socket.data.role = undefined;

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Update cursor position
      socket.on('cursor:update', async (data: { line: number; column: number; filePath: string }) => {
        try {
          const { userId, sessionId, projectId } = socket.data;
          
          if (!sessionId) return;

          // Update cursor in manager
          await collaborationManager.updateCursor(sessionId, userId, data);

          // Broadcast to other users in session
          socket.to(sessionId).emit('cursor:updated', {
            userId,
            cursor: data
          });

          // Publish event to bus
          await publish(`project:${projectId}`, {
            type: 'collaboration.cursor_updated',
            projectId,
            data: {
              sessionId,
              userId,
              cursor: data
            }
          });

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Editor content change
      socket.on('editor:change', async (data: { filePath: string; content: string; changes: any }) => {
        try {
          const { userId, sessionId, projectId } = socket.data;
          
          if (!sessionId) return;

          // Check permissions
          if (!collaborationManager.hasPermission(sessionId, userId, 'write')) {
            socket.emit('error', { message: 'No write permission' });
            return;
          }

          // Broadcast to other users
          socket.to(sessionId).emit('editor:changed', {
            userId,
            ...data
          });

          // Publish event to bus
          await publish(`project:${projectId}`, {
            type: 'collaboration.file_changed',
            projectId,
            data: {
              sessionId,
              userId,
              ...data
            }
          });

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Terminal input
      socket.on('terminal:input', async (data: { command: string }) => {
        try {
          const { userId, sessionId, projectId } = socket.data;
          
          if (!sessionId) return;

          // Check permissions
          if (!collaborationManager.hasPermission(sessionId, userId, 'terminal')) {
            socket.emit('error', { message: 'No terminal permission' });
            return;
          }

          // Broadcast to all users in session (including sender)
          io.to(sessionId).emit('terminal:input', {
            userId,
            command: data.command,
            timestamp: new Date().toISOString()
          });

          // Publish event to bus
          await publish(`project:${projectId}`, {
            type: 'collaboration.terminal_input',
            projectId,
            data: {
              sessionId,
              userId,
              command: data.command
            }
          });

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Terminal output
      socket.on('terminal:output', async (data: { output: string }) => {
        try {
          const { userId, sessionId, projectId } = socket.data;
          
          if (!sessionId) return;

          // Broadcast to all users in session
          io.to(sessionId).emit('terminal:output', {
            userId,
            output: data.output,
            timestamp: new Date().toISOString()
          });

          // Publish event to bus
          await publish(`project:${projectId}`, {
            type: 'collaboration.terminal_output',
            projectId,
            data: {
              sessionId,
              userId,
              output: data.output
            }
          });

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // User typing indicator
      socket.on('user:typing', async (data: { filePath: string; isTyping: boolean }) => {
        try {
          const { userId, sessionId } = socket.data;
          
          if (!sessionId) return;

          // Broadcast to other users
          socket.to(sessionId).emit('user:typing', {
            userId,
            ...data
          });

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // User presence update
      socket.on('user:presence', async (data: { status: 'online' | 'away' | 'offline' }) => {
        try {
          const { userId, sessionId, projectId } = socket.data;
          
          if (!sessionId) return;

          // Broadcast to other users
          socket.to(sessionId).emit('user:presence', {
            userId,
            status: data.status,
            timestamp: new Date().toISOString()
          });

          // Publish event to bus
          await publish(`project:${projectId}`, {
            type: 'collaboration.user_presence',
            projectId,
            data: {
              sessionId,
              userId,
              status: data.status
            }
          });

        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          const { userId, sessionId, projectId } = socket.data;
          
          if (sessionId) {
            await collaborationManager.leaveSession(sessionId, userId);
            
            // Notify other users
            socket.to(sessionId).emit('user:left', {
              userId,
              activeUsers: collaborationManager.getActiveUsers(sessionId)
            });

            // Publish event to bus
            if (projectId) {
              await publish(`project:${projectId}`, {
                type: 'collaboration.user_disconnected',
                projectId,
                data: {
                  sessionId,
                  userId,
                  activeUsers: collaborationManager.getActiveUsers(sessionId).length
                }
              });
            }
          }

          console.log('User disconnected from collaboration socket:', socket.id);

        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });

    // Cleanup inactive sessions every 5 minutes
    setInterval(async () => {
      await collaborationManager.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  res.end();
}

// Helper function to verify token (implement based on your auth system)
async function verifyToken(token: string): Promise<{ userId: string; projectId: string; sessionId?: string; role?: string }> {
  // This is a placeholder - implement your actual token verification
  try {
    // For demo purposes, we'll decode a simple token
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return {
      userId: payload.userId,
      projectId: payload.projectId,
      sessionId: payload.sessionId,
      role: payload.role
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}