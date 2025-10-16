import { io, Socket } from 'socket.io-client';
import { useIDEStore } from './store';

export class IDESyncManager {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  
  connect(projectId: string) {
    this.projectId = projectId;
    
    this.socket = io('/', {
      query: { 
        projectId,
        type: 'ide'
      }
    });
    
    this.setupEventListeners();
    return this.socket;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.projectId = null;
    }
  }
  
  private setupEventListeners() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('IDE connected to WebSocket');
    });
    
    this.socket.on('disconnect', () => {
      console.log('IDE disconnected from WebSocket');
    });
    
    this.socket.on('file:changed', (data: { fileId: string; content: string; userId: string }) => {
      const store = useIDEStore.getState();
      if (data.userId !== this.socket?.id) {
        store.updateFileContent(data.fileId, data.content);
      }
    });
    
    this.socket.on('user:joined', (user: { id: string; name: string; avatar?: string }) => {
      const store = useIDEStore.getState();
      const updatedUsers = [...store.users.filter(u => u.id !== user.id), { ...user, isOnline: true }];
      store.updateUsers(updatedUsers);
    });
    
    this.socket.on('user:left', (userId: string) => {
      const store = useIDEStore.getState();
      const updatedUsers = store.users.map(u => 
        u.id === userId ? { ...u, isOnline: false } : u
      );
      store.updateUsers(updatedUsers);
    });
    
    this.socket.on('cursor:moved', (data: { userId: string; line: number; column: number }) => {
      const store = useIDEStore.getState();
      store.updateUsers(
        store.users.map(user =>
          user.id === data.userId 
            ? { ...user, cursor: { line: data.line, column: data.column } }
            : user
        )
      );
    });
    
    this.socket.on('container:status', (status: string) => {
      const store = useIDEStore.getState();
      if (store.container) {
        store.setContainer({ ...store.container, status });
      }
    });
    
    this.socket.on('metrics:update', (metrics: any) => {
      const store = useIDEStore.getState();
      store.setMetrics(metrics);
    });
  }
  
  // File operations
  saveFile(fileId: string, content: string) {
    if (!this.socket) return;
    
    this.socket.emit('file:save', { fileId, content });
  }
  
  createFile(path: string, name: string) {
    if (!this.socket) return;
    
    this.socket.emit('file:create', { path, name });
  }
  
  deleteFile(fileId: string) {
    if (!this.socket) return;
    
    this.socket.emit('file:delete', { fileId });
  }
  
  renameFile(fileId: string, newName: string) {
    if (!this.socket) return;
    
    this.socket.emit('file:rename', { fileId, newName });
  }
  
  // Cursor operations
  sendCursorPosition(line: number, column: number) {
    if (!this.socket) return;
    
    this.socket.emit('cursor:move', { line, column });
  }
  
  // Terminal operations
  sendTerminalInput(sessionId: string, input: string) {
    if (!this.socket) return;
    
    this.socket.emit('terminal:input', { sessionId, input });
  }
  
  createTerminalSession(containerId: string) {
    if (!this.socket) return;
    
    this.socket.emit('terminal:create', { containerId });
  }
  
  closeTerminalSession(sessionId: string) {
    if (!this.socket) return;
    
    this.socket.emit('terminal:close', { sessionId });
  }
  
  // Container operations
  startContainer(containerId: string) {
    if (!this.socket) return;
    
    this.socket.emit('container:start', { containerId });
  }
  
  stopContainer(containerId: string) {
    if (!this.socket) return;
    
    this.socket.emit('container:stop', { containerId });
  }
  
  restartContainer(containerId: string) {
    if (!this.socket) return;
    
    this.socket.emit('container:restart', { containerId });
  }
}

export const ideSyncManager = new IDESyncManager();