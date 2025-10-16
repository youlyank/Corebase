import { Server } from 'socket.io';
import { DatabaseEventService } from './realtime/database-events';
import { crdtCollaborationEngine } from './collaboration/crdt-engine';

export const setupSocket = (io: Server) => {
  const dbEventService = DatabaseEventService.getInstance();
  
  // Start database event listener
  dbEventService.startListening();

  // Setup collaboration engine event handlers
  setupCollaborationHandlers(io);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle IDE connections
    const { projectId, type } = socket.handshake.query as { 
      projectId?: string; 
      type?: string 
    };
    
    if (type === 'ide' && projectId) {
      // Join IDE room for this project
      socket.join(`ide:${projectId}`);
      console.log(`IDE client ${socket.id} joined project: ${projectId}`);
      
      // Notify other users in the IDE
      socket.to(`ide:${projectId}`).emit('user:joined', {
        id: socket.id,
        name: `User ${socket.id.slice(-4)}`, // Would get from auth
        avatar: null
      });
      
      // Handle IDE-specific events
      setupIDEHandlers(socket, projectId);
    }
    
    // Join table rooms for realtime updates
    socket.on('join-table', (tableName: string) => {
      socket.join(`table:${tableName}`);
      console.log(`Client ${socket.id} joined table: ${tableName}`);

      // Send recent events for this table
      dbEventService.getRecentEvents(tableName, 10).then(events => {
        socket.emit('recent-events', { table: tableName, events });
      });
    });

    socket.on('leave-table', (tableName: string) => {
      socket.leave(`table:${tableName}`);
      console.log(`Client ${socket.id} left table: ${tableName}`);
    });

    // Handle database changes
    socket.on('db-change', (data: { table: string; event: string; record: any }) => {
      socket.to(`table:${data.table}`).emit('db-change', {
        table: data.table,
        event: data.event,
        record: data.record,
        timestamp: new Date().toISOString()
      });

      // Publish to database event service
      dbEventService.publishEvent({
        type: data.event as 'INSERT' | 'UPDATE' | 'DELETE',
        table: data.table,
        schema: 'public',
        record: data.record,
        timestamp: new Date().toISOString()
      });
    });

    // Handle real-time metrics
    socket.on('subscribe-metrics', () => {
      socket.join('metrics');
      console.log(`Client ${socket.id} subscribed to metrics`);
    });

    socket.on('unsubscribe-metrics', () => {
      socket.leave('metrics');
      console.log(`Client ${socket.id} unsubscribed from metrics`);
    });

    // Subscribe to project changes
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`Client ${socket.id} joined project: ${projectId}`);
    });

    // Handle file upload progress
    socket.on('upload-progress', (data: { fileId: string; progress: number }) => {
      socket.broadcast.emit('upload-progress', data);
    });

    // Broadcast metrics updates every 5 seconds
    const metricsInterval = setInterval(() => {
      if (socket.rooms.has('metrics')) {
        socket.emit('metrics-update', {
          databaseConnections: Math.floor(Math.random() * 10) + 20,
          activeUsers: Math.floor(Math.random() * 200) + 1100,
          apiRequests: Math.floor(Math.random() * 10000) + 40000,
          timestamp: new Date().toISOString()
        });
      }
    }, 5000);

    // Listen for database changes and broadcast to relevant rooms
    dbEventService.on('database-change', (event) => {
      io.to(`table:${event.table}`).emit('db-change', event);
      
      // Also broadcast to project rooms if this is a project-specific table
      if (event.table.startsWith('project_')) {
        const projectId = event.table.replace('project_', '');
        io.to(`project:${projectId}`).emit('project-change', event);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      clearInterval(metricsInterval);
      
      // Notify IDE users if this was an IDE client
      if (type === 'ide' && projectId) {
        socket.to(`ide:${projectId}`).emit('user:left', socket.id);
      }
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to CoreBase Realtime Engine',
      clientId: socket.id,
      timestamp: new Date().toISOString(),
      features: [
        'database_changes',
        'realtime_metrics',
        'file_upload_progress',
        'project_collaboration',
        'ide_features'
      ]
    });
  });
};

// IDE-specific event handlers
function setupIDEHandlers(socket: any, projectId: string) {
  // File operations
  socket.on('file:save', (data: { fileId: string; content: string }) => {
    socket.to(`ide:${projectId}`).emit('file:updated', {
      fileId: data.fileId,
      content: data.content,
      userId: socket.id
    });
  });

  socket.on('file:create', (data: { path: string; name: string }) => {
    socket.to(`ide:${projectId}`).emit('file:created', {
      ...data,
      userId: socket.id
    });
  });

  socket.on('file:delete', (data: { fileId: string }) => {
    socket.to(`ide:${projectId}`).emit('file:deleted', {
      fileId: data.fileId,
      userId: socket.id
    });
  });

  socket.on('file:rename', (data: { fileId: string; newName: string }) => {
    socket.to(`ide:${projectId}`).emit('file:renamed', {
      fileId: data.fileId,
      newName: data.newName,
      userId: socket.id
    });
  });

  // Cursor tracking
  socket.on('cursor:move', (data: { line: number; column: number }) => {
    socket.to(`ide:${projectId}`).emit('cursor:moved', {
      userId: socket.id,
      line: data.line,
      column: data.column
    });
  });

  // Terminal operations
  socket.on('terminal:create', (data: { containerId: string }) => {
    const sessionId = `terminal_${socket.id}_${Date.now()}`;
    socket.join(`terminal:${sessionId}`);
    
    socket.emit('terminal:created', {
      sessionId,
      containerId: data.containerId
    });
  });

  socket.on('terminal:input', (data: { sessionId: string; input: string }) => {
    // Broadcast terminal input to other users in the same session
    socket.to(`terminal:${data.sessionId}`).emit('terminal:output', {
      sessionId: data.sessionId,
      output: data.input,
      userId: socket.id
    });
  });

  socket.on('terminal:close', (data: { sessionId: string }) => {
    socket.leave(`terminal:${data.sessionId}`);
    socket.to(`terminal:${data.sessionId}`).emit('terminal:closed', {
      sessionId: data.sessionId,
      userId: socket.id
    });
  });

  // Container operations
  socket.on('container:start', (data: { containerId: string }) => {
    socket.to(`ide:${projectId}`).emit('container:status', 'starting');
    // Would actually start the container here
  });

  socket.on('container:stop', (data: { containerId: string }) => {
    socket.to(`ide:${projectId}`).emit('container:status', 'stopping');
    // Would actually stop the container here
  });

  socket.on('container:restart', (data: { containerId: string }) => {
    socket.to(`ide:${projectId}`).emit('container:status', 'restarting');
    // Would actually restart the container here
  });

  // Chat functionality
  socket.on('chat:message', (data: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: string;
  }) => {
    socket.to(`ide:${projectId}`).emit('chat:message', data);
  });

  // Metrics streaming
  socket.on('subscribe:metrics', () => {
    socket.join(`metrics:${projectId}`);
    
    // Start sending metrics updates
    const metricsInterval = setInterval(() => {
      if (socket.rooms.has(`metrics:${projectId}`)) {
        socket.emit('metrics:update', {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          network: {
            in: Math.random() * 1000,
            out: Math.random() * 1000
          },
          timestamp: new Date().toISOString()
        });
      } else {
        clearInterval(metricsInterval);
      }
    }, 2000);
  });
}

// Collaboration engine event handlers
function setupCollaborationHandlers(io: Server) {
  // Handle user join/leave events
  crdtCollaborationEngine.on('userJoinedSession', ({ sessionId, user }) => {
    io.to(`session:${sessionId}`).emit('user:joined', {
      sessionId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        color: user.color,
        status: user.status
      }
    });
  });

  crdtCollaborationEngine.on('userLeftSession', ({ sessionId, userId }) => {
    io.to(`session:${sessionId}`).emit('user:left', {
      sessionId,
      userId
    });
  });

  // Handle operation events
  crdtCollaborationEngine.on('operationApplied', ({ sessionId, fileId, operation, content, version }) => {
    io.to(`session:${sessionId}`).emit('operation:applied', {
      fileId,
      operation,
      content,
      version,
      timestamp: new Date().toISOString()
    });
  });

  // Handle cursor and selection events
  crdtCollaborationEngine.on('cursorUpdated', ({ sessionId, userId, cursor }) => {
    io.to(`session:${sessionId}`).emit('cursor:updated', {
      userId,
      cursor,
      timestamp: new Date().toISOString()
    });
  });

  crdtCollaborationEngine.on('selectionUpdated', ({ sessionId, userId, selection }) => {
    io.to(`session:${sessionId}`).emit('selection:updated', {
      userId,
      selection,
      timestamp: new Date().toISOString()
    });
  });

  // Handle message events
  crdtCollaborationEngine.on('messageSent', ({ sessionId, message }) => {
    io.to(`session:${sessionId}`).emit('message:received', {
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Handle file events
  crdtCollaborationEngine.on('fileInitialized', ({ sessionId, fileId, content }) => {
    io.to(`session:${sessionId}`).emit('file:initialized', {
      fileId,
      content,
      timestamp: new Date().toISOString()
    });
  });

  crdtCollaborationEngine.on('fileStateSync', ({ sessionId, userId, fileId, content, version }) => {
    io.to(`user:${userId}`).emit('file:sync', {
      sessionId,
      fileId,
      content,
      version,
      timestamp: new Date().toISOString()
    });
  });

  // Handle broadcast events
  crdtCollaborationEngine.on('broadcastToUser', ({ userId, sessionId, data }) => {
    io.to(`user:${userId}`).emit('collaboration:event', {
      sessionId,
      data,
      timestamp: new Date().toISOString()
    });
  });
}