import { EventEmitter } from 'events';
import { db } from '@/lib/db';

export interface ContainerConfig {
  image: string;
  name: string;
  projectId: string;
  userId: string;
  environment?: Record<string, string>;
  ports?: Record<string, number>;
  volumes?: Record<string, string>;
  resources?: {
    memory?: number;
    cpu?: number;
  };
  autoRemove?: boolean;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'error';
  ports: Record<string, string>;
  createdAt: Date;
  startedAt?: Date;
  projectId: string;
  userId: string;
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    networkIO: {
      rx: number;
      tx: number;
    };
  };
}

export interface ExecOptions {
  command: string[];
  workingDir?: string;
  user?: string;
  timeout?: number;
  attachStdout?: boolean;
  attachStderr?: boolean;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class MockRuntimeService extends EventEmitter {
  private static instance: MockRuntimeService;
  private containers: Map<string, ContainerInfo> = new Map();
  private isMonitoring = false;

  private constructor() {
    super();
    this.startMonitoring();
  }

  static getInstance(): MockRuntimeService {
    if (!MockRuntimeService.instance) {
      MockRuntimeService.instance = new MockRuntimeService();
    }
    return MockRuntimeService.instance;
  }

  async startContainer(config: ContainerConfig): Promise<ContainerInfo> {
    try {
      // Simulate container startup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const containerInfo: ContainerInfo = {
        id: `mock_${Math.random().toString(36).substring(7)}`,
        name: `corebase-${config.projectId}-${config.name}`,
        image: config.image,
        status: 'running',
        ports: config.ports || {},
        createdAt: new Date(),
        startedAt: new Date(),
        projectId: config.projectId,
        userId: config.userId,
        resources: {
          memoryUsage: Math.floor(Math.random() * 100 * 1024 * 1024), // Random memory usage
          cpuUsage: Math.random() * 20, // Random CPU usage
          networkIO: {
            rx: Math.floor(Math.random() * 1000000),
            tx: Math.floor(Math.random() * 1000000)
          }
        }
      };

      this.containers.set(containerInfo.id, containerInfo);

      // Save to database
      await this.saveContainerToDatabase(containerInfo);

      // Emit event
      this.emit('container:started', containerInfo);

      console.log(`Mock container started: ${containerInfo.name} (${containerInfo.id})`);
      return containerInfo;

    } catch (error) {
      console.error('Failed to start mock container:', error);
      this.emit('container:error', { config, error: error.message });
      throw error;
    }
  }

  async stopContainer(containerId: string, userId: string): Promise<void> {
    try {
      const container = this.containers.get(containerId);
      if (!container) {
        throw new Error('Container not found');
      }

      // Simulate container stop
      await new Promise(resolve => setTimeout(resolve, 500));

      container.status = 'stopped';
      container.resources.memoryUsage = 0;
      container.resources.cpuUsage = 0;

      // Update database
      await this.updateContainerStatus(containerId, 'stopped');

      // Emit event
      this.emit('container:stopped', { containerId, name: container.name });

      console.log(`Mock container stopped: ${container.name} (${containerId})`);

    } catch (error) {
      console.error('Failed to stop mock container:', error);
      throw error;
    }
  }

  async restartContainer(containerId: string): Promise<ContainerInfo> {
    try {
      const container = this.containers.get(containerId);
      if (!container) {
        throw new Error('Container not found');
      }

      // Simulate container restart
      await new Promise(resolve => setTimeout(resolve, 1500));

      container.status = 'running';
      container.startedAt = new Date();
      container.resources.memoryUsage = Math.floor(Math.random() * 100 * 1024 * 1024);
      container.resources.cpuUsage = Math.random() * 20;

      // Update database
      await this.updateContainerStatus(containerId, 'running');

      // Emit event
      this.emit('container:restarted', container);

      return container;

    } catch (error) {
      console.error('Failed to restart mock container:', error);
      throw error;
    }
  }

  async getContainerLogs(containerId: string, options: {
    tail?: number;
    follow?: boolean;
    timestamps?: boolean;
  } = {}): Promise<NodeJS.ReadableStream> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error('Container not found');
    }

    // Generate mock logs
    const mockLogs = [
      `${options.timestamps ? new Date().toISOString() + ' ' : ''}Starting container...`,
      `${options.timestamps ? new Date().toISOString() + ' ' : ''}Container started successfully`,
      `${options.timestamps ? new Date().toISOString() + ' ' : ''}Server running on port ${Object.keys(container.ports)[0] || '3000'}`,
      `${options.timestamps ? new Date().toISOString() + ' ' : ''}GET /api/health 200`,
      `${options.timestamps ? new Date().toISOString() + ' ' : ''}POST /api/users 201`
    ];

    const { Readable } = await import('stream');
    
    return new Readable({
      read() {
        mockLogs.forEach((log, index) => {
          setTimeout(() => {
            this.push(log + '\n');
            if (index === mockLogs.length - 1) {
              this.push(null);
            }
          }, index * 100);
        });
      }
    });
  }

  async executeCommand(containerId: string, options: ExecOptions): Promise<ExecResult> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error('Container not found');
    }

    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    const command = options.command.join(' ');
    
    // Mock different command results
    if (command.includes('npm install')) {
      return {
        exitCode: 0,
        stdout: 'npm notice created a lockfile as package-lock.json\n' +
               'added 57 packages from 42 contributors and audited 57 packages in 3.2s\n' +
               'found 0 vulnerabilities\n',
        stderr: ''
      };
    } else if (command.includes('node')) {
      return {
        exitCode: 0,
        stdout: 'Server running on port 3000\n',
        stderr: ''
      };
    } else if (command.includes('python')) {
      return {
        exitCode: 0,
        stdout: 'Python 3.11.0\n',
        stderr: ''
      };
    } else {
      return {
        exitCode: 0,
        stdout: `Command executed: ${command}\n`,
        stderr: ''
      };
    }
  }

  async getContainerStats(containerId: string): Promise<any> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error('Container not found');
    }

    // Generate mock stats
    return {
      memoryUsage: Math.floor(Math.random() * 200 * 1024 * 1024),
      memoryLimit: 512 * 1024 * 1024,
      cpuUsage: Math.random() * 30,
      networkIO: {
        rx: Math.floor(Math.random() * 2000000),
        tx: Math.floor(Math.random() * 2000000)
      },
      blockIO: {
        read: Math.floor(Math.random() * 100000),
        write: Math.floor(Math.random() * 100000)
      }
    };
  }

  async listUserContainers(userId: string): Promise<ContainerInfo[]> {
    try {
      // Get from database
      const containers = await db.container.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return containers.map(container => {
        const mockContainer = this.containers.get(container.id) || {
          resources: {
            memoryUsage: Math.floor(Math.random() * 100 * 1024 * 1024),
            cpuUsage: Math.random() * 20,
            networkIO: { rx: 0, tx: 0 }
          }
        };

        return {
          id: container.id,
          name: container.name,
          image: container.image,
          status: container.status as any,
          ports: JSON.parse(container.ports || '{}'),
          createdAt: container.createdAt,
          startedAt: container.startedAt || undefined,
          projectId: container.projectId,
          userId: container.userId,
          resources: mockContainer.resources
        };
      });

    } catch (error) {
      console.error('Failed to list user containers:', error);
      return [];
    }
  }

  async cleanupExpiredContainers(): Promise<void> {
    console.log('Mock cleanup: No expired containers to clean up');
  }

  // Private helper methods
  private async saveContainerToDatabase(info: ContainerInfo): Promise<void> {
    try {
      await db.container.upsert({
        where: { id: info.id },
        update: {
          status: info.status,
          ports: JSON.stringify(info.ports),
          startedAt: info.startedAt,
        },
        create: {
          id: info.id,
          name: info.name,
          image: info.image,
          status: info.status,
          ports: JSON.stringify(info.ports),
          projectId: info.projectId,
          userId: info.userId,
          createdAt: info.createdAt,
          startedAt: info.startedAt,
        }
      });
    } catch (error) {
      console.error('Failed to save container to database:', error);
    }
  }

  private async updateContainerStatus(containerId: string, status: string): Promise<void> {
    try {
      await db.container.update({
        where: { id: containerId },
        data: { 
          status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update container status:', error);
    }
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Simulate metrics updates every 30 seconds
    setInterval(async () => {
      for (const [containerId, container] of this.containers) {
        if (container.status === 'running') {
          // Update random metrics
          container.resources.memoryUsage = Math.floor(Math.random() * 200 * 1024 * 1024);
          container.resources.cpuUsage = Math.random() * 30;
          container.resources.networkIO = {
            rx: Math.floor(Math.random() * 2000000),
            tx: Math.floor(Math.random() * 2000000)
          };

          this.emit('container:stats', { 
            containerId, 
            stats: {
              memoryUsage: container.resources.memoryUsage,
              cpuUsage: container.resources.cpuUsage,
              networkIO: container.resources.networkIO
            }
          });
        }
      }
    }, 30000);

    console.log('Mock runtime monitoring started');
  }
}

export const mockRuntimeService = MockRuntimeService.getInstance();
export default mockRuntimeService;