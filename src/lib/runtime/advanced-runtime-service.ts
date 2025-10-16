/**
 * Advanced Runtime Service
 * Integrates with container pool for high-performance container management
 */

import { containerPoolManager, PooledContainer, ContainerExecOptions, ContainerExecResult } from './container-pool';
import { EventEmitter } from 'events';

export interface RuntimeProject {
  id: string;
  name: string;
  templateId: string;
  userId: string;
  containerId?: string;
  status: 'stopped' | 'starting' | 'running' | 'error';
  createdAt: Date;
  lastActive: Date;
  settings: {
    autoStart: boolean;
    idleTimeout: number;
    resourceLimits: {
      memory: string;
      cpu: string;
      disk: string;
    };
  };
}

export interface RuntimeSession {
  id: string;
  projectId: string;
  userId: string;
  containerId: string;
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'idle' | 'expired';
  commands: RuntimeCommand[];
}

export interface RuntimeCommand {
  id: string;
  sessionId: string;
  command: string;
  timestamp: Date;
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
  cpuUsed: number;
}

class AdvancedRuntimeService extends EventEmitter {
  private projects: Map<string, RuntimeProject> = new Map();
  private sessions: Map<string, RuntimeSession> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Create a new runtime project
   */
  async createProject(
    name: string,
    templateId: string,
    userId: string,
    settings?: Partial<RuntimeProject['settings']>
  ): Promise<RuntimeProject> {
    const project: RuntimeProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      templateId,
      userId,
      status: 'stopped',
      createdAt: new Date(),
      lastActive: new Date(),
      settings: {
        autoStart: true,
        idleTimeout: this.DEFAULT_IDLE_TIMEOUT,
        resourceLimits: {
          memory: '512m',
          cpu: '0.5',
          disk: '1g'
        },
        ...settings
      }
    };

    this.projects.set(project.id, project);
    this.emit('projectCreated', project);

    if (project.settings.autoStart) {
      await this.startProject(project.id, userId);
    }

    return project;
  }

  /**
   * Start a project runtime
   */
  async startProject(projectId: string, userId: string): Promise<RuntimeProject> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Unauthorized access to project');
    }

    if (project.status === 'running') {
      return project;
    }

    project.status = 'starting';
    this.emit('projectStarting', project);

    try {
      // Acquire container from pool
      const container = await containerPoolManager.acquireContainer(
        project.templateId,
        project.id,
        userId
      );

      if (!container) {
        throw new Error('Failed to acquire container');
      }

      project.containerId = container.id;
      project.status = 'running';
      project.lastActive = new Date();

      // Create session
      const session = await this.createSession(project.id, userId, container.id);

      this.emit('projectStarted', { project, container, session });
      return project;

    } catch (error) {
      project.status = 'error';
      this.emit('projectError', { project, error });
      throw error;
    }
  }

  /**
   * Stop a project runtime
   */
  async stopProject(projectId: string, userId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Unauthorized access to project');
    }

    if (project.status !== 'running') {
      return;
    }

    try {
      // Release container back to pool
      if (project.containerId) {
        await containerPoolManager.releaseContainer(project.containerId);
        project.containerId = undefined;
      }

      // End all sessions for this project
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.projectId === projectId) {
          await this.endSession(sessionId);
        }
      }

      project.status = 'stopped';
      this.emit('projectStopped', project);

    } catch (error) {
      project.status = 'error';
      this.emit('projectError', { project, error });
      throw error;
    }
  }

  /**
   * Execute command in project container
   */
  async executeCommand(
    projectId: string,
    userId: string,
    command: string[],
    options?: Partial<ContainerExecOptions>
  ): Promise<ContainerExecResult> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Unauthorized access to project');
    }

    if (project.status !== 'running' || !project.containerId) {
      throw new Error('Project is not running');
    }

    // Update session activity
    const session = this.getActiveSession(projectId, userId);
    if (session) {
      session.lastActivity = new Date();
      this.resetSessionTimeout(session.id);
    }

    const execOptions: ContainerExecOptions = {
      command,
      userId,
      projectId,
      ...options
    };

    try {
      const result = await containerPoolManager.executeCommand(execOptions);

      // Record command in session
      if (session) {
        const runtimeCommand: RuntimeCommand = {
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: session.id,
          command: command.join(' '),
          timestamp: new Date(),
          exitCode: result.exitCode,
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          cpuUsed: result.cpuUsed
        };

        session.commands.push(runtimeCommand);
        this.emit('commandExecuted', runtimeCommand);
      }

      project.lastActive = new Date();
      this.emit('commandCompleted', { projectId, result });

      return result;

    } catch (error) {
      this.emit('commandError', { projectId, command, error });
      throw error;
    }
  }

  /**
   * Get project logs
   */
  async getProjectLogs(projectId: string, userId: string, tail = 100): Promise<string[]> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Unauthorized access to project');
    }

    if (!project.containerId) {
      return [];
    }

    return containerPoolManager.getContainerLogs(project.containerId, tail);
  }

  /**
   * Get project metrics
   */
  async getProjectMetrics(projectId: string, userId: string) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Unauthorized access to project');
    }

    if (!project.containerId) {
      return { cpu: 0, memory: 0, networkIO: 0, diskIO: 0 };
    }

    return containerPoolManager.getContainerMetrics(project.containerId);
  }

  /**
   * Get user projects
   */
  getUserProjects(userId: string): RuntimeProject[] {
    return Array.from(this.projects.values()).filter(p => p.userId === userId);
  }

  /**
   * Get project details
   */
  getProject(projectId: string, userId?: string): RuntimeProject | null {
    const project = this.projects.get(projectId);
    if (!project) {
      return null;
    }

    if (userId && project.userId !== userId) {
      return null;
    }

    return project;
  }

  /**
   * Update project settings
   */
  async updateProjectSettings(
    projectId: string,
    userId: string,
    settings: Partial<RuntimeProject['settings']>
  ): Promise<RuntimeProject> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Unauthorized access to project');
    }

    project.settings = { ...project.settings, ...settings };
    this.emit('projectUpdated', project);

    return project;
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Unauthorized access to project');
    }

    // Stop project if running
    if (project.status === 'running') {
      await this.stopProject(projectId, userId);
    }

    this.projects.delete(projectId);
    this.emit('projectDeleted', project);
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats(): {
    totalProjects: number;
    runningProjects: number;
    activeSessions: number;
    poolStatus: any;
  } {
    const runningProjects = Array.from(this.projects.values())
      .filter(p => p.status === 'running').length;

    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'active').length;

    return {
      totalProjects: this.projects.size,
      runningProjects,
      activeSessions,
      poolStatus: containerPoolManager.getPoolStatus()
    };
  }

  // Private methods
  private async createSession(projectId: string, userId: string, containerId: string): Promise<RuntimeSession> {
    const session: RuntimeSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      userId,
      containerId,
      startTime: new Date(),
      lastActivity: new Date(),
      status: 'active',
      commands: []
    };

    this.sessions.set(session.id, session);
    this.resetSessionTimeout(session.id);
    this.emit('sessionCreated', session);

    return session;
  }

  private async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'expired';
    this.sessions.delete(sessionId);

    // Clear timeout
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }

    this.emit('sessionEnded', session);
  }

  private getActiveSession(projectId: string, userId: string): RuntimeSession | null {
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId && 
          session.userId === userId && 
          session.status === 'active') {
        return session;
      }
    }
    return null;
  }

  private resetSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      await this.endSession(sessionId);
    }, this.DEFAULT_IDLE_TIMEOUT);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private setupEventListeners(): void {
    containerPoolManager.on('containerExpired', (container: PooledContainer) => {
      // Handle expired container
      for (const project of this.projects.values()) {
        if (project.containerId === container.id) {
          project.status = 'stopped';
          project.containerId = undefined;
          this.emit('projectStopped', project);
        }
      }
    });

    containerPoolManager.on('containerAcquired', (container: PooledContainer) => {
      this.emit('containerAcquired', container);
    });

    containerPoolManager.on('containerReleased', (container: PooledContainer) => {
      this.emit('containerReleased', container);
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Clear all session timeouts
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.sessionTimeouts.clear();

    // Stop all running projects
    for (const project of this.projects.values()) {
      if (project.status === 'running') {
        try {
          await this.stopProject(project.id, project.userId);
        } catch (error) {
          console.error(`Failed to stop project ${project.id}:`, error);
        }
      }
    }

    // Shutdown container pool
    await containerPoolManager.shutdown();

    this.emit('shutdown');
  }
}

// Singleton instance
export const advancedRuntimeService = new AdvancedRuntimeService();

export default AdvancedRuntimeService;