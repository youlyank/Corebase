import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirectory: boolean;
  children?: File[];
  size?: number;
  modifiedAt?: string;
}

export interface TerminalSession {
  id: string;
  containerId: string;
  isActive: boolean;
  output: string[];
}

export interface ContainerMetrics {
  cpu: number;
  memory: number;
  network: {
    in: number;
    out: number;
  };
  status: 'running' | 'stopped' | 'error' | 'starting';
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  cursor?: {
    line: number;
    column: number;
  };
  isOnline: boolean;
}

interface IDEStore {
  // Project state
  projectId: string | null;
  project: any | null;
  
  // File system
  files: File[];
  currentFile: File | null;
  openTabs: File[];
  activeTabId: string | null;
  
  // Terminal
  terminalSessions: TerminalSession[];
  activeTerminalId: string | null;
  
  // Container
  container: any | null;
  metrics: ContainerMetrics | null;
  
  // Collaboration
  users: User[];
  socket: Socket | null;
  
  // UI state
  sidebarWidth: number;
  terminalHeight: number;
  showTerminal: boolean;
  showExplorer: boolean;
  
  // Actions
  setProject: (projectId: string, project: any) => void;
  setFiles: (files: File[]) => void;
  setCurrentFile: (file: File | null) => void;
  openTab: (file: File) => void;
  closeTab: (fileId: string) => void;
  setActiveTab: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  
  // Terminal actions
  createTerminalSession: (containerId: string) => void;
  closeTerminalSession: (sessionId: string) => void;
  addTerminalOutput: (sessionId: string, output: string) => void;
  setActiveTerminal: (sessionId: string) => void;
  
  // Container actions
  setContainer: (container: any) => void;
  setMetrics: (metrics: ContainerMetrics) => void;
  startContainer: () => Promise<void>;
  stopContainer: () => Promise<void>;
  restartContainer: () => Promise<void>;
  
  // Collaboration actions
  connectSocket: (projectId: string) => void;
  disconnectSocket: () => void;
  updateUsers: (users: User[]) => void;
  sendCursorUpdate: (line: number, column: number) => void;
  
  // UI actions
  setSidebarWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
  toggleTerminal: () => void;
  toggleExplorer: () => void;
}

export const useIDEStore = create<IDEStore>((set, get) => ({
  // Initial state
  projectId: null,
  project: null,
  files: [],
  currentFile: null,
  openTabs: [],
  activeTabId: null,
  terminalSessions: [],
  activeTerminalId: null,
  container: null,
  metrics: null,
  users: [],
  socket: null,
  sidebarWidth: 280,
  terminalHeight: 300,
  showTerminal: true,
  showExplorer: true,
  
  // Project actions
  setProject: (projectId, project) => set({ projectId, project }),
  
  // File system actions
  setFiles: (files) => set({ files }),
  
  setCurrentFile: (file) => set({ currentFile: file }),
  
  openTab: (file) => set((state) => {
    const existingTab = state.openTabs.find(tab => tab.id === file.id);
    if (!existingTab) {
      return {
        openTabs: [...state.openTabs, file],
        activeTabId: file.id,
        currentFile: file
      };
    }
    return {
      activeTabId: file.id,
      currentFile: file
    };
  }),
  
  closeTab: (fileId) => set((state) => {
    const newTabs = state.openTabs.filter(tab => tab.id !== fileId);
    const newActiveTab = newTabs.length > 0 ? newTabs[0].id : null;
    const newCurrentFile = newTabs.find(tab => tab.id === newActiveTab) || null;
    
    return {
      openTabs: newTabs,
      activeTabId: newActiveTab,
      currentFile: newCurrentFile
    };
  }),
  
  setActiveTab: (fileId) => set((state) => {
    const file = state.openTabs.find(tab => tab.id === fileId);
    return {
      activeTabId: fileId,
      currentFile: file || null
    };
  }),
  
  updateFileContent: (fileId, content) => set((state) => ({
    files: state.files.map(file => 
      file.id === fileId ? { ...file, content } : file
    ),
    currentFile: state.currentFile?.id === fileId 
      ? { ...state.currentFile, content }
      : state.currentFile,
    openTabs: state.openTabs.map(tab => 
      tab.id === fileId ? { ...tab, content } : tab
    )
  })),
  
  // Terminal actions
  createTerminalSession: (containerId) => set((state) => {
    const newSession: TerminalSession = {
      id: `terminal_${Date.now()}`,
      containerId,
      isActive: true,
      output: []
    };
    
    return {
      terminalSessions: [...state.terminalSessions, newSession],
      activeTerminalId: newSession.id
    };
  }),
  
  closeTerminalSession: (sessionId) => set((state) => ({
    terminalSessions: state.terminalSessions.filter(session => session.id !== sessionId),
    activeTerminalId: state.activeTerminalId === sessionId 
      ? state.terminalSessions.find(s => s.id !== sessionId)?.id || null
      : state.activeTerminalId
  })),
  
  addTerminalOutput: (sessionId, output) => set((state) => ({
    terminalSessions: state.terminalSessions.map(session =>
      session.id === sessionId 
        ? { ...session, output: [...session.output, output] }
        : session
    )
  })),
  
  setActiveTerminal: (sessionId) => set({ activeTerminalId: sessionId }),
  
  // Container actions
  setContainer: (container) => set({ container }),
  
  setMetrics: (metrics) => set({ metrics }),
  
  startContainer: async () => {
    const { container } = get();
    if (!container) return;
    
    try {
      const response = await fetch('/api/runtime/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: container.id })
      });
      
      if (response.ok) {
        const updatedContainer = await response.json();
        set({ container: updatedContainer });
      }
    } catch (error) {
      console.error('Failed to start container:', error);
    }
  },
  
  stopContainer: async () => {
    const { container } = get();
    if (!container) return;
    
    try {
      const response = await fetch('/api/runtime/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: container.id })
      });
      
      if (response.ok) {
        const updatedContainer = await response.json();
        set({ container: updatedContainer });
      }
    } catch (error) {
      console.error('Failed to stop container:', error);
    }
  },
  
  restartContainer: async () => {
    const { container } = get();
    if (!container) return;
    
    try {
      const response = await fetch('/api/runtime/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: container.id })
      });
      
      if (response.ok) {
        const updatedContainer = await response.json();
        set({ container: updatedContainer });
      }
    } catch (error) {
      console.error('Failed to restart container:', error);
    }
  },
  
  // Collaboration actions
  connectSocket: (projectId) => {
    const socket = io('/', {
      query: { projectId, type: 'ide' }
    });
    
    socket.on('users:update', (users: User[]) => {
      set({ users });
    });
    
    socket.on('file:updated', (fileId: string, content: string) => {
      get().updateFileContent(fileId, content);
    });
    
    socket.on('cursor:update', (userId: string, line: number, column: number) => {
      set((state) => ({
        users: state.users.map(user =>
          user.id === userId 
            ? { ...user, cursor: { line, column } }
            : user
        )
      }));
    });
    
    set({ socket });
  },
  
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, users: [] });
    }
  },
  
  updateUsers: (users) => set({ users }),
  
  sendCursorUpdate: (line, column) => {
    const { socket } = get();
    if (socket) {
      socket.emit('cursor:update', { line, column });
    }
  },
  
  // UI actions
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  
  setTerminalHeight: (height) => set({ terminalHeight: height }),
  
  toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
  
  toggleExplorer: () => set((state) => ({ showExplorer: !state.showExplorer }))
}));