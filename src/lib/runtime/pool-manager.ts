import { EventEmitter } from 'events';
import Docker from 'dockerode';
import { runtimeService } from './runtime-service';

export interface PoolConfig {
  maxSize: number;
  minSize: number;
  image: string;
  resources: {
    memory: number;
    cpu: number;
  };
  healthCheck: {
    command: string[];
    interval: number;
    timeout: number;
    retries: number;
  };
  autoScale: {
    enabled: boolean;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    maxScaleUp: number;
    maxScaleDown: number;
  };
}

export interface PooledContainer {
  id: string;
  poolId: string;
  status: 'idle' | 'busy' | 'warming' | 'terminating';
  createdAt: Date;
  lastUsedAt?: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  warmupTime?: number;
  projectId?: string;
  userId?: string;
}

export interface ContainerPool {
  id: string;
  name: string;
  config: PoolConfig;
  containers: PooledContainer[];
  createdAt: Date;
  lastScaledAt?: Date;
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export class ContainerPoolManager extends EventEmitter {
  private static instance: ContainerPoolManager;
  private docker: Docker;
  private pools: Map<string, ContainerPool> = new Map();
  private isManaging = false;
  private managementInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.docker = new Docker();
  }

  static getInstance(): ContainerPoolManager {
    if (!ContainerPoolManager.instance) {
      ContainerPoolManager.instance = new ContainerPoolManager();
    }
    return ContainerPoolManager.instance;
  }

  async createPool(name: string, config: PoolConfig): Promise<ContainerPool> {
    const pool: ContainerPool = {
      id: Math.random().toString(36).substring(7),
      name,
      config,
      containers: [],
      createdAt: new Date(),
      metrics: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0
      }
    };

    this.pools.set(pool.id, pool);

    // Initialize minimum containers
    await this.initializePool(pool);

    console.log(`Container pool created: ${name} (${pool.id})`);
    this.emit('pool:created', pool);

    return pool;
  }

  async destroyPool(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    // Terminate all containers in the pool
    await Promise.all(
      pool.containers.map(container => this.terminateContainer(container.id))
    );

    this.pools.delete(poolId);
    console.log(`Container pool destroyed: ${pool.name} (${poolId})`);
    this.emit('pool:destroyed', { poolId, name: pool.name });
  }

  async acquireContainer(poolId: string, projectId: string, userId: string): Promise<PooledContainer> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    // Find an idle container
    let container = pool.containers.find(c => c.status === 'idle' && c.healthStatus === 'healthy');

    if (!container) {
      // No idle containers available, create a new one if possible
      if (pool.containers.length < pool.config.maxSize) {
        container = await this.createPooledContainer(pool, projectId, userId);
      } else {
        // Pool is at capacity, wait for a container to become available
        container = await this.waitForAvailableContainer(pool);
      }
    }

    // Mark container as busy
    container.status = 'busy';
    container.lastUsedAt = new Date();
    container.projectId = projectId;
    container.userId = userId;

    // Update metrics
    pool.metrics.totalRequests++;

    this.emit('container:acquired', { poolId, container });
    return container;
  }

  async releaseContainer(poolId: string, containerId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    const container = pool.containers.find(c => c.id === containerId);
    if (!container) {
      throw new Error('Container not found in pool');
    }

    // Reset container state
    container.status = 'idle';
    container.projectId = undefined;
    container.userId = undefined;
    container.lastUsedAt = new Date();

    // Clean up container if needed
    await this.cleanupContainer(container);

    this.emit('container:released', { poolId, container });
  }

  async getPool(poolId: string): Promise<ContainerPool | undefined> {
    return this.pools.get(poolId);
  }

  async listPools(): Promise<ContainerPool[]> {
    return Array.from(this.pools.values());
  }

  async getPoolMetrics(poolId: string): Promise<any> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    const healthyContainers = pool.containers.filter(c => c.healthStatus === 'healthy');
    const busyContainers = pool.containers.filter(c => c.status === 'busy');
    const idleContainers = pool.containers.filter(c => c.status === 'idle');

    return {
      poolId,
      name: pool.name,
      totalContainers: pool.containers.length,
      healthyContainers: healthyContainers.length,
      busyContainers: busyContainers.length,
      idleContainers: idleContainers.length,
      metrics: pool.metrics,
      efficiency: idleContainers.length / pool.containers.length,
      utilization: busyContainers.length / pool.containers.length
    };
  }

  startManagement(): void {
    if (this.isManaging) return;

    this.isManaging = true;

    // Pool management every 30 seconds
    this.managementInterval = setInterval(async () => {
      await this.managePools();
    }, 30000);

    // Health checks every 60 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000);

    console.log('Container pool management started');
  }

  stopManagement(): void {
    this.isManaging = false;

    if (this.managementInterval) {
      clearInterval(this.managementInterval);
      this.managementInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    console.log('Container pool management stopped');
  }

  private async initializePool(pool: ContainerPool): Promise<void> {
    const promises = [];
    for (let i = 0; i < pool.config.minSize; i++) {
      promises.push(this.createPooledContainer(pool));
    }
    await Promise.all(promises);
  }

  private async createPooledContainer(
    pool: ContainerPool, 
    projectId?: string, 
    userId?: string
  ): Promise<PooledContainer> {
    const startTime = Date.now();

    try {
      // Create container using runtime service
      const containerInfo = await runtimeService.startContainer({
        image: pool.config.image,
        name: `${pool.name}-pooled-${Date.now()}`,
        projectId: projectId || 'pool',
        userId: userId || 'system',
        environment: {
          POOL_ID: pool.id,
          POOL_NAME: pool.name,
          CONTAINER_TYPE: 'pooled'
        },
        resources: pool.config.resources
      });

      const pooledContainer: PooledContainer = {
        id: containerInfo.id,
        poolId: pool.id,
        status: 'warming',
        createdAt: new Date(),
        healthStatus: 'unknown',
        warmupTime: Date.now() - startTime,
        projectId,
        userId
      };

      pool.containers.push(pooledContainer);

      // Warm up the container
      await this.warmupContainer(pooledContainer, pool.config);

      pooledContainer.status = 'idle';
      pooledContainer.healthStatus = 'healthy';

      this.emit('container:created', pooledContainer);
      return pooledContainer;

    } catch (error) {
      console.error('Failed to create pooled container:', error);
      throw error;
    }
  }

  private async warmupContainer(container: PooledContainer, config: PoolConfig): Promise<void> {
    try {
      // Execute warmup commands
      await runtimeService.executeCommand(container.id, {
        command: ['echo', 'Container warmed up'],
        timeout: 5000
      });

      // Perform health check
      const healthResult = await runtimeService.executeCommand(container.id, {
        command: config.healthCheck.command,
        timeout: config.healthCheck.timeout
      });

      if (healthResult.exitCode !== 0) {
        container.healthStatus = 'unhealthy';
        console.warn(`Container ${container.id} failed health check during warmup`);
      }

    } catch (error) {
      container.healthStatus = 'unhealthy';
      console.error(`Container ${container.id} warmup failed:`, error);
    }
  }

  private async terminateContainer(containerId: string): Promise<void> {
    try {
      await runtimeService.stopContainer(containerId, 'system');
    } catch (error) {
      console.error(`Failed to terminate container ${containerId}:`, error);
    }
  }

  private async cleanupContainer(container: PooledContainer): Promise<void> {
    try {
      // Clean up any temporary files or processes
      await runtimeService.executeCommand(container.id, {
        command: ['rm', '-rf', '/tmp/*'],
        timeout: 5000
      });
    } catch (error) {
      console.error(`Failed to cleanup container ${container.id}:`, error);
    }
  }

  private async waitForAvailableContainer(pool: ContainerPool): Promise<PooledContainer> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for available container'));
      }, 30000); // 30 second timeout

      const checkInterval = setInterval(() => {
        const container = pool.containers.find(c => c.status === 'idle' && c.healthStatus === 'healthy');
        if (container) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(container);
        }
      }, 1000); // Check every second
    });
  }

  private async managePools(): Promise<void> {
    for (const pool of this.pools.values()) {
      await this.managePool(pool);
    }
  }

  private async managePool(pool: ContainerPool): Promise<void> {
    if (!pool.config.autoScale.enabled) return;

    const idleContainers = pool.containers.filter(c => c.status === 'idle');
    const busyContainers = pool.containers.filter(c => c.status === 'busy');
    const utilizationRate = busyContainers.length / pool.containers.length;

    // Scale up if utilization is high
    if (utilizationRate > pool.config.autoScale.scaleUpThreshold) {
      const scaleUpCount = Math.min(
        pool.config.autoScale.maxScaleUp,
        pool.config.maxSize - pool.containers.length
      );

      for (let i = 0; i < scaleUpCount; i++) {
        await this.createPooledContainer(pool);
      }

      pool.lastScaledAt = new Date();
      this.emit('pool:scaled-up', { poolId: pool.id, scaledBy: scaleUpCount });
    }

    // Scale down if utilization is low
    if (utilizationRate < pool.config.autoScale.scaleDownThreshold && pool.containers.length > pool.config.minSize) {
      const scaleDownCount = Math.min(
        pool.config.autoScale.maxScaleDown,
        pool.containers.length - pool.config.minSize
      );

      // Remove idle containers
      const containersToRemove = idleContainers.slice(0, scaleDownCount);
      for (const container of containersToRemove) {
        await this.terminateContainer(container.id);
        pool.containers = pool.containers.filter(c => c.id !== container.id);
      }

      pool.lastScaledAt = new Date();
      this.emit('pool:scaled-down', { poolId: pool.id, scaledBy: scaleDownCount });
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const pool of this.pools.values()) {
      for (const container of pool.containers) {
        await this.checkContainerHealth(container, pool.config);
      }
    }
  }

  private async checkContainerHealth(container: PooledContainer, config: PoolConfig): Promise<void> {
    try {
      const result = await runtimeService.executeCommand(container.id, {
        command: config.healthCheck.command,
        timeout: config.healthCheck.timeout
      });

      const previousHealth = container.healthStatus;
      container.healthStatus = result.exitCode === 0 ? 'healthy' : 'unhealthy';

      if (previousHealth !== container.healthStatus) {
        this.emit('container:health-changed', {
          containerId: container.id,
          previousHealth,
          currentHealth: container.healthStatus
        });
      }

    } catch (error) {
      container.healthStatus = 'unhealthy';
      console.error(`Health check failed for container ${container.id}:`, error);
    }
  }
}

export const containerPoolManager = ContainerPoolManager.getInstance();
export default containerPoolManager;