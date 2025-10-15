/**
 * Advanced Container Pool Manager
 * Provides fast container startup, reuse, and lifecycle management
 */

import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ContainerTemplate {
  id: string;
  name: string;
  image: string;
  language: string;
  version: string;
  defaultPorts: number[];
  setupCommands: string[];
  environment: Record<string, string>;
  limits: {
    memory: string;
    cpu: string;
    disk: string;
  };
}

export interface PooledContainer {
  id: string;
  containerId: string;
  templateId: string;
  projectId: string;
  userId: string;
  status: 'ready' | 'in-use' | 'warming' | 'stopped' | 'error';
  createdAt: Date;
  lastUsed: Date;
  expiresAt: Date;
  portMappings: Record<number, number>;
  workspacePath: string;
  metrics: {
    cpu: number;
    memory: number;
    networkIO: number;
    diskIO: number;
  };
}

export interface ContainerExecOptions {
  command: string[];
  workingDir?: string;
  environment?: Record<string, string>;
  timeout?: number;
  userId?: string;
  projectId?: string;
}

export interface ContainerExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  memoryUsed: number;
  cpuUsed: number;
}

class ContainerPoolManager extends EventEmitter {
  private docker: Docker;
  private pools: Map<string, PooledContainer[]> = new Map();
  private templates: Map<string, ContainerTemplate> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private metricsInterval: NodeJS.Timeout;
  private readonly POOL_SIZE = 3;
  private readonly CONTAINER_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly WARMUP_TTL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    super();
    this.docker = new Docker();
    this.initializeTemplates();
    this.startCleanupTimer();
    this.startMetricsTimer();
  }

  /**
   * Initialize container templates for different languages
   */
  private async initializeTemplates() {
    const templates: ContainerTemplate[] = [
      {
        id: 'node-18',
        name: 'Node.js 18',
        image: 'node:18-alpine',
        language: 'javascript',
        version: '18.19.0',
        defaultPorts: [3000, 8080],
        setupCommands: [
          'npm config set prefix /home/node/.npm-global',
          'echo "export PATH=/home/node/.npm-global/bin:$PATH" >> ~/.bashrc'
        ],
        environment: {
          NODE_ENV: 'development',
          TERM: 'xterm'
        },
        limits: {
          memory: '512m',
          cpu: '0.5',
          disk: '1g'
        }
      },
      {
        id: 'python-3.11',
        name: 'Python 3.11',
        image: 'python:3.11-alpine',
        language: 'python',
        version: '3.11.7',
        defaultPorts: [8000, 5000],
        setupCommands: [
          'pip install --user pipx',
          'python -m pipx ensurepath'
        ],
        environment: {
          PYTHONPATH: '/workspace',
          TERM: 'xterm'
        },
        limits: {
          memory: '512m',
          cpu: '0.5',
          disk: '1g'
        }
      },
      {
        id: 'go-1.21',
        name: 'Go 1.21',
        image: 'golang:1.21-alpine',
        language: 'go',
        version: '1.21.6',
        defaultPorts: [8080],
        setupCommands: [
          'go install github.com/cosmtrek/air@latest'
        ],
        environment: {
          GOPATH: '/go',
          GOBIN: '/go/bin',
          TERM: 'xterm'
        },
        limits: {
          memory: '512m',
          cpu: '0.5',
          disk: '1g'
        }
      },
      {
        id: 'java-17',
        name: 'Java 17',
        image: 'openjdk:17-alpine',
        language: 'java',
        version: '17.0.9',
        defaultPorts: [8080],
        setupCommands: [
          'apk add --no-cache maven'
        ],
        environment: {
          JAVA_HOME: '/opt/java/openjdk',
          TERM: 'xterm'
        },
        limits: {
          memory: '768m',
          cpu: '0.5',
          disk: '1g'
        }
      }
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
      await this.initializePool(template.id);
    }
  }

  /**
   * Initialize container pool for a template
   */
  private async initializePool(templateId: string) {
    const pool: PooledContainer[] = [];
    
    for (let i = 0; i < this.POOL_SIZE; i++) {
      try {
        const container = await this.createWarmContainer(templateId);
        if (container) {
          pool.push(container);
        }
      } catch (error) {
        console.error(`Failed to create warm container for ${templateId}:`, error);
      }
    }

    this.pools.set(templateId, pool);
    this.emit('poolInitialized', { templateId, size: pool.length });
  }

  /**
   * Create a warmed container ready for immediate use
   */
  private async createWarmContainer(templateId: string): Promise<PooledContainer | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const containerId = uuidv4();
    const workspacePath = `/workspace/${containerId}`;

    try {
      // Create container with volume mapping
      const container = await this.docker.createContainer({
        Image: template.image,
        name: `corebase-warm-${containerId}`,
        WorkingDir: workspacePath,
        Env: Object.entries(template.environment).map(([key, value]) => `${key}=${value}`),
        HostConfig: {
          Memory: this.parseMemoryLimit(template.limits.memory),
          CpuQuota: this.parseCpuLimit(template.limits.cpu),
          PortBindings: this.createPortBindings(template.defaultPorts),
          Binds: [
            `${process.cwd()}/workspaces/${containerId}:${workspacePath}:rw`
          ],
          AutoRemove: false
        },
        ExposedPorts: this.createExposedPorts(template.defaultPorts)
      });

      // Start the container
      await container.start();

      // Run setup commands
      for (const command of template.setupCommands) {
        await this.execInContainer(container, command.split(' '));
      }

      // Get port mappings
      const containerInfo = await container.inspect();
      const portMappings = this.extractPortMappings(containerInfo, template.defaultPorts);

      const pooledContainer: PooledContainer = {
        id: containerId,
        containerId: container.id,
        templateId,
        projectId: '',
        userId: '',
        status: 'ready',
        createdAt: new Date(),
        lastUsed: new Date(),
        expiresAt: new Date(Date.now() + this.WARMUP_TTL),
        portMappings,
        workspacePath,
        metrics: {
          cpu: 0,
          memory: 0,
          networkIO: 0,
          diskIO: 0
        }
      };

      this.emit('containerCreated', pooledContainer);
      return pooledContainer;

    } catch (error) {
      console.error(`Failed to create warm container:`, error);
      return null;
    }
  }

  /**
   * Acquire a container for a project
   */
  async acquireContainer(
    templateId: string,
    projectId: string,
    userId: string
  ): Promise<PooledContainer | null> {
    const pool = this.pools.get(templateId);
    if (!pool) {
      await this.initializePool(templateId);
      return this.acquireContainer(templateId, projectId, userId);
    }

    // Find available container
    let container = pool.find(c => c.status === 'ready');
    
    if (!container) {
      // Create new container if pool is empty
      container = await this.createWarmContainer(templateId);
      if (container) {
        pool.push(container);
      }
    }

    if (container) {
      // Assign to project
      container.status = 'in-use';
      container.projectId = projectId;
      container.userId = userId;
      container.lastUsed = new Date();
      container.expiresAt = new Date(Date.now() + this.CONTAINER_TTL);

      // Create workspace directory
      await this.ensureWorkspace(container);

      this.emit('containerAcquired', container);
      return container;
    }

    return null;
  }

  /**
   * Release container back to pool
   */
  async releaseContainer(containerId: string): Promise<void> {
    for (const pool of this.pools.values()) {
      const container = pool.find(c => c.id === containerId);
      if (container) {
        container.status = 'ready';
        container.projectId = '';
        container.userId = '';
        container.lastUsed = new Date();
        container.expiresAt = new Date(Date.now() + this.WARMUP_TTL);

        // Clean workspace
        await this.cleanWorkspace(container);

        this.emit('containerReleased', container);
        return;
      }
    }
  }

  /**
   * Execute command in container
   */
  async executeCommand(options: ContainerExecOptions): Promise<ContainerExecResult> {
    const { userId, projectId } = options;
    
    // Find container for user/project
    let container: PooledContainer | null = null;
    for (const pool of this.pools.values()) {
      const found = pool.find(c => 
        c.userId === userId && 
        c.projectId === projectId && 
        c.status === 'in-use'
      );
      if (found) {
        container = found;
        break;
      }
    }

    if (!container) {
      throw new Error('No active container found for user/project');
    }

    const dockerContainer = this.docker.getContainer(container.containerId);
    const startTime = Date.now();

    try {
      const result = await this.execInContainer(
        dockerContainer, 
        options.command,
        options.workingDir || container.workspacePath,
        options.environment,
        options.timeout || 30000
      );

      const executionTime = Date.now() - startTime;

      // Update container metrics
      container.metrics.cpu = await this.getCpuUsage(dockerContainer);
      container.metrics.memory = await this.getMemoryUsage(dockerContainer);

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime,
        memoryUsed: container.metrics.memory,
        cpuUsed: container.metrics.cpu
      };

    } catch (error) {
      container.status = 'error';
      throw error;
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId: string, tail = 100): Promise<string[]> {
    for (const pool of this.pools.values()) {
      const container = pool.find(c => c.id === containerId);
      if (container) {
        const dockerContainer = this.docker.getContainer(container.containerId);
        const logs = await dockerContainer.logs({
          stdout: true,
          stderr: true,
          tail,
          timestamps: false
        });
        
        return logs.toString().split('\n').filter(line => line.trim());
      }
    }
    return [];
  }

  /**
   * Get container metrics
   */
  async getContainerMetrics(containerId: string): Promise<PooledContainer['metrics']> {
    for (const pool of this.pools.values()) {
      const container = pool.find(c => c.id === containerId);
      if (container) {
        const dockerContainer = this.docker.getContainer(container.containerId);
        
        container.metrics.cpu = await this.getCpuUsage(dockerContainer);
        container.metrics.memory = await this.getMemoryUsage(dockerContainer);
        container.metrics.networkIO = await this.getNetworkIO(dockerContainer);
        container.metrics.diskIO = await this.getDiskIO(dockerContainer);
        
        return { ...container.metrics };
      }
    }
    return { cpu: 0, memory: 0, networkIO: 0, diskIO: 0 };
  }

  /**
   * List available templates
   */
  getTemplates(): ContainerTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get pool status
   */
  getPoolStatus(): Record<string, { total: number; ready: number; inUse: number; warming: number }> {
    const status: Record<string, { total: number; ready: number; inUse: number; warming: number }> = {};
    
    for (const [templateId, pool] of this.pools.entries()) {
      status[templateId] = {
        total: pool.length,
        ready: pool.filter(c => c.status === 'ready').length,
        inUse: pool.filter(c => c.status === 'in-use').length,
        warming: pool.filter(c => c.status === 'warming').length
      };
    }
    
    return status;
  }

  // Private helper methods
  private async execInContainer(
    container: Docker.Container,
    command: string[],
    workingDir?: string,
    environment?: Record<string, string>,
    timeout = 30000
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const exec = await container.exec({
      Cmd: command,
      WorkingDir: workingDir,
      Env: environment ? Object.entries(environment).map(([k, v]) => `${k}=${v}`) : undefined,
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    
    let stdout = '';
    let stderr = '';

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Command execution timeout'));
      }, timeout);

      stream.on('data', (chunk: Buffer) => {
        // Docker exec stream format: [stream_type, 0, 0, 0, length, data]
        if (chunk.length > 8) {
          const type = chunk[0];
          const data = chunk.slice(8).toString();
          
          if (type === 1) { // stdout
            stdout += data;
          } else if (type === 2) { // stderr
            stderr += data;
          }
        }
      });

      stream.on('end', async () => {
        clearTimeout(timeoutId);
        
        try {
          const inspect = await exec.inspect();
          resolve({
            exitCode: inspect.ExitCode || 0,
            stdout,
            stderr
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  private parseMemoryLimit(limit: string): number {
    const units: Record<string, number> = { b: 1, k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = limit.toLowerCase().match(/^(\d+)([bkmg]?)$/);
    if (!match) return 512 * 1024 * 1024; // 512MB default
    
    const [, value, unit] = match;
    return parseInt(value) * (units[unit] || 1);
  }

  private parseCpuLimit(limit: string): number {
    return Math.floor(parseFloat(limit) * 100000); // Docker uses 100000 as 100% CPU
  }

  private createPortBindings(ports: number[]): Record<string, Array<{ HostPort: string }>> {
    const bindings: Record<string, Array<{ HostPort: string }>> = {};
    for (const port of ports) {
      bindings[`${port}/tcp`] = [{ HostPort: '0' }]; // Random host port
    }
    return bindings;
  }

  private createExposedPorts(ports: number[]): Record<string, object> {
    const exposed: Record<string, object> = {};
    for (const port of ports) {
      exposed[`${port}/tcp`] = {};
    }
    return exposed;
  }

  private extractPortMappings(containerInfo: any, defaultPorts: number[]): Record<number, number> {
    const mappings: Record<number, number> = {};
    const ports = containerInfo.NetworkSettings.Ports;
    
    for (const port of defaultPorts) {
      const portKey = `${port}/tcp`;
      if (ports[portKey] && ports[portKey].length > 0) {
        mappings[port] = parseInt(ports[portKey][0].HostPort);
      }
    }
    
    return mappings;
  }

  private async ensureWorkspace(container: PooledContainer): Promise<void> {
    const dockerContainer = this.docker.getContainer(container.containerId);
    await this.execInContainer(dockerContainer, ['mkdir', '-p', container.workspacePath]);
  }

  private async cleanWorkspace(container: PooledContainer): Promise<void> {
    const dockerContainer = this.docker.getContainer(container.containerId);
    await this.execInContainer(dockerContainer, ['rm', '-rf', `${container.workspacePath}/*`]);
  }

  private async getCpuUsage(container: Docker.Container): Promise<number> {
    try {
      const stats = await container.stats({ stream: false });
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuCount = stats.cpu_stats.online_cpus || 1;
      
      return (cpuDelta / systemDelta) * cpuCount * 100;
    } catch {
      return 0;
    }
  }

  private async getMemoryUsage(container: Docker.Container): Promise<number> {
    try {
      const stats = await container.stats({ stream: false });
      return stats.memory_stats.usage || 0;
    } catch {
      return 0;
    }
  }

  private async getNetworkIO(container: Docker.Container): Promise<number> {
    try {
      const stats = await container.stats({ stream: false });
      const networks = stats.networks || {};
      return Object.values(networks).reduce((total: number, net: any) => 
        total + (net.rx_bytes || 0) + (net.tx_bytes || 0), 0
      );
    } catch {
      return 0;
    }
  }

  private async getDiskIO(container: Docker.Container): Promise<number> {
    try {
      const stats = await container.stats({ stream: false });
      const blkio = stats.blkio_stats || {};
      return (blkio.io_service_bytes_recursive || []).reduce((total: number, entry: any) => 
        total + (entry.value || 0), 0
      );
    } catch {
      return 0;
    }
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredContainers();
    }, 60000); // Check every minute
  }

  private startMetricsTimer(): void {
    this.metricsInterval = setInterval(() => {
      this.updateAllMetrics();
    }, 5000); // Update metrics every 5 seconds
  }

  private async cleanupExpiredContainers(): Promise<void> {
    const now = Date.now();
    
    for (const [templateId, pool] of this.pools.entries()) {
      const expiredContainers = pool.filter(c => 
        (c.status === 'ready' || c.status === 'warming') && 
        c.expiresAt.getTime() < now
      );

      for (const container of expiredContainers) {
        try {
          const dockerContainer = this.docker.getContainer(container.containerId);
          await dockerContainer.stop();
          await dockerContainer.remove();
          
          const index = pool.indexOf(container);
          pool.splice(index, 1);
          
          this.emit('containerExpired', container);
        } catch (error) {
          console.error('Failed to cleanup container ' + container.id + ':', error);
        }
      }
    }
  }

  private async updateAllMetrics(): Promise<void> {
    for (const pool of this.pools.values()) {
      for (const container of pool) {
        if (container.status === 'in-use') {
          await this.getContainerMetrics(container.id);
        }
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);
    clearInterval(this.metricsInterval);

    for (const pool of this.pools.values()) {
      for (const container of pool) {
        try {
          const dockerContainer = this.docker.getContainer(container.containerId);
          await dockerContainer.stop();
          await dockerContainer.remove();
        } catch (error) {
          console.error('Failed to stop container ' + container.id + ':', error);
        }
      }
    }

    this.pools.clear();
    this.emit('shutdown');
  }
}

// Singleton instance
export const containerPoolManager = new ContainerPoolManager();

export default ContainerPoolManager;