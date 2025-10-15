/**
 * Prometheus Metrics Collector
 * Provides comprehensive metrics collection for the CoreBase IDE system
 */

import { EventEmitter } from 'events';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export interface MetricConfig {
  name: string;
  help: string;
  type: 'counter' | 'histogram' | 'gauge';
  labelNames?: string[];
  buckets?: number[];
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    buffers: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

export interface ApplicationMetrics {
  timestamp: Date;
  activeUsers: number;
  activeProjects: number;
  activeContainers: number;
  activeCollaborationSessions: number;
  totalRequests: number;
  errorRate: number;
  responseTime: number;
  fileOperations: number;
  terminalCommands: number;
}

export interface ContainerMetrics {
  containerId: string;
  projectId: string;
  timestamp: Date;
  cpu: number;
  memory: number;
  networkIO: number;
  diskIO: number;
  uptime: number;
  status: 'running' | 'stopped' | 'error';
}

class PrometheusMetricsCollector extends EventEmitter {
  private metrics: Map<string, any> = new Map();
  private systemMetricsInterval?: NodeJS.Timeout;
  private applicationMetricsInterval?: NodeJS.Timeout;
  private containerMetricsInterval?: NodeJS.Timeout;
  private readonly SYSTEM_INTERVAL = 30000; // 30 seconds
  private readonly APPLICATION_INTERVAL = 10000; // 10 seconds
  private readonly CONTAINER_INTERVAL = 5000; // 5 seconds

  constructor() {
    super();
    this.initializeMetrics();
    this.startMetricsCollection();
    collectDefaultMetrics();
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics() {
    // HTTP metrics
    this.metrics.set('http_requests_total', new Counter({
      name: 'corebase_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_id']
    }));

    this.metrics.set('http_request_duration_seconds', new Histogram({
      name: 'corebase_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    }));

    // System metrics
    this.metrics.set('system_cpu_usage_percent', new Gauge({
      name: 'corebase_system_cpu_usage_percent',
      help: 'System CPU usage percentage',
      labelNames: ['core']
    }));

    this.metrics.set('system_memory_usage_bytes', new Gauge({
      name: 'corebase_system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['type'] // used, free, cached, buffers
    }));

    this.metrics.set('system_disk_usage_bytes', new Gauge({
      name: 'corebase_system_disk_usage_bytes',
      help: 'System disk usage in bytes',
      labelNames: ['type'] // total, used, free
    }));

    this.metrics.set('system_network_bytes_total', new Counter({
      name: 'corebase_system_network_bytes_total',
      help: 'Total network bytes transferred',
      labelNames: ['direction'] // in, out
    }));

    // Application metrics
    this.metrics.set('active_users_total', new Gauge({
      name: 'corebase_active_users_total',
      help: 'Number of active users'
    }));

    this.metrics.set('active_projects_total', new Gauge({
      name: 'corebase_active_projects_total',
      help: 'Number of active projects'
    }));

    this.metrics.set('active_containers_total', new Gauge({
      name: 'corebase_active_containers_total',
      help: 'Number of active containers'
    }));

    this.metrics.set('collaboration_sessions_total', new Gauge({
      name: 'corebase_collaboration_sessions_total',
      help: 'Number of active collaboration sessions'
    }));

    this.metrics.set('file_operations_total', new Counter({
      name: 'corebase_file_operations_total',
      help: 'Total number of file operations',
      labelNames: ['operation', 'status']
    }));

    this.metrics.set('terminal_commands_total', new Counter({
      name: 'corebase_terminal_commands_total',
      help: 'Total number of terminal commands executed',
      labelNames: ['exit_code']
    }));

    // Container metrics
    this.metrics.set('container_cpu_usage_percent', new Gauge({
      name: 'corebase_container_cpu_usage_percent',
      help: 'Container CPU usage percentage',
      labelNames: ['container_id', 'project_id']
    }));

    this.metrics.set('container_memory_usage_bytes', new Gauge({
      name: 'corebase_container_memory_usage_bytes',
      help: 'Container memory usage in bytes',
      labelNames: ['container_id', 'project_id']
    }));

    this.metrics.set('container_network_bytes_total', new Counter({
      name: 'corebase_container_network_bytes_total',
      help: 'Container network bytes transferred',
      labelNames: ['container_id', 'project_id', 'direction']
    }));

    this.metrics.set('container_disk_bytes_total', new Counter({
      name: 'corebase_container_disk_bytes_total',
      help: 'Container disk bytes transferred',
      labelNames: ['container_id', 'project_id', 'direction']
    }));

    this.metrics.set('container_uptime_seconds', new Gauge({
      name: 'corebase_container_uptime_seconds',
      help: 'Container uptime in seconds',
      labelNames: ['container_id', 'project_id']
    }));

    // IDE specific metrics
    this.metrics.set('editor_operations_total', new Counter({
      name: 'corebase_editor_operations_total',
      help: 'Total number of editor operations',
      labelNames: ['operation', 'user_id']
    }));

    this.metrics.set('collaboration_events_total', new Counter({
      name: 'corebase_collaboration_events_total',
      help: 'Total number of collaboration events',
      labelNames: ['event_type', 'session_id']
    }));

    this.metrics.set('websocket_connections_total', new Gauge({
      name: 'corebase_websocket_connections_total',
      help: 'Number of active WebSocket connections',
      labelNames: ['type'] // ide, collaboration, metrics
    }));
  }

  /**
   * Start metrics collection intervals
   */
  private startMetricsCollection() {
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.SYSTEM_INTERVAL);

    this.applicationMetricsInterval = setInterval(() => {
      this.collectApplicationMetrics();
    }, this.APPLICATION_INTERVAL);

    this.containerMetricsInterval = setInterval(() => {
      this.collectContainerMetrics();
    }, this.CONTAINER_INTERVAL);
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics() {
    try {
      const metrics = await this.getSystemMetrics();
      
      // Update CPU metrics
      const cpuGauge = this.metrics.get('system_cpu_usage_percent');
      if (cpuGauge) {
        cpuGauge.set(metrics.cpu.usage);
      }

      // Update memory metrics
      const memoryGauge = this.metrics.get('system_memory_usage_bytes');
      if (memoryGauge) {
        memoryGauge.set({ type: 'used' }, metrics.memory.used);
        memoryGauge.set({ type: 'free' }, metrics.memory.free);
        memoryGauge.set({ type: 'cached' }, metrics.memory.cached);
        memoryGauge.set({ type: 'buffers' }, metrics.memory.buffers);
      }

      // Update disk metrics
      const diskGauge = this.metrics.get('system_disk_usage_bytes');
      if (diskGauge) {
        diskGauge.set({ type: 'total' }, metrics.disk.total);
        diskGauge.set({ type: 'used' }, metrics.disk.used);
        diskGauge.set({ type: 'free' }, metrics.disk.free);
      }

      // Update network metrics
      const networkCounter = this.metrics.get('system_network_bytes_total');
      if (networkCounter) {
        networkCounter.inc({ direction: 'in' }, metrics.network.bytesIn);
        networkCounter.inc({ direction: 'out' }, metrics.network.bytesOut);
      }

      this.emit('systemMetrics', metrics);

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Collect application metrics
   */
  private async collectApplicationMetrics() {
    try {
      const metrics = await this.getApplicationMetrics();
      
      // Update application metrics
      const activeUsersGauge = this.metrics.get('active_users_total');
      if (activeUsersGauge) {
        activeUsersGauge.set(metrics.activeUsers);
      }

      const activeProjectsGauge = this.metrics.get('active_projects_total');
      if (activeProjectsGauge) {
        activeProjectsGauge.set(metrics.activeProjects);
      }

      const activeContainersGauge = this.metrics.get('active_containers_total');
      if (activeContainersGauge) {
        activeContainersGauge.set(metrics.activeContainers);
      }

      const collaborationSessionsGauge = this.metrics.get('collaboration_sessions_total');
      if (collaborationSessionsGauge) {
        collaborationSessionsGauge.set(metrics.activeCollaborationSessions);
      }

      this.emit('applicationMetrics', metrics);

    } catch (error) {
      console.error('Error collecting application metrics:', error);
    }
  }

  /**
   * Collect container metrics
   */
  private async collectContainerMetrics() {
    try {
      const metrics = await this.getContainerMetrics();
      
      for (const containerMetric of metrics) {
        // Update container metrics
        const cpuGauge = this.metrics.get('container_cpu_usage_percent');
        if (cpuGauge) {
          cpuGauge.set(
            { container_id: containerMetric.containerId, project_id: containerMetric.projectId },
            containerMetric.cpu
          );
        }

        const memoryGauge = this.metrics.get('container_memory_usage_bytes');
        if (memoryGauge) {
          memoryGauge.set(
            { container_id: containerMetric.containerId, project_id: containerMetric.projectId },
            containerMetric.memory
          );
        }

        const networkCounter = this.metrics.get('container_network_bytes_total');
        if (networkCounter) {
          networkCounter.inc(
            { container_id: containerMetric.containerId, project_id: containerMetric.projectId, direction: 'in' },
            containerMetric.networkIO / 2
          );
          networkCounter.inc(
            { container_id: containerMetric.containerId, project_id: containerMetric.projectId, direction: 'out' },
            containerMetric.networkIO / 2
          );
        }

        const diskCounter = this.metrics.get('container_disk_bytes_total');
        if (diskCounter) {
          diskCounter.inc(
            { container_id: containerMetric.containerId, project_id: containerMetric.projectId, direction: 'read' },
            containerMetric.diskIO / 2
          );
          diskCounter.inc(
            { container_id: containerMetric.containerId, project_id: containerMetric.projectId, direction: 'write' },
            containerMetric.diskIO / 2
          );
        }

        const uptimeGauge = this.metrics.get('container_uptime_seconds');
        if (uptimeGauge) {
          uptimeGauge.set(
            { container_id: containerMetric.containerId, project_id: containerMetric.projectId },
            containerMetric.uptime
          );
        }
      }

      this.emit('containerMetrics', metrics);

    } catch (error) {
      console.error('Error collecting container metrics:', error);
    }
  }

  /**
   * Get system metrics (mock implementation)
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, this would use system libraries
    // For now, we'll return mock data
    return {
      timestamp: new Date(),
      cpu: {
        usage: Math.random() * 100,
        loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
        cores: 4
      },
      memory: {
        total: 8 * 1024 * 1024 * 1024, // 8GB
        used: Math.random() * 6 * 1024 * 1024 * 1024,
        free: Math.random() * 2 * 1024 * 1024 * 1024,
        cached: Math.random() * 1024 * 1024 * 1024,
        buffers: Math.random() * 512 * 1024 * 1024
      },
      disk: {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        used: Math.random() * 80 * 1024 * 1024 * 1024,
        free: Math.random() * 20 * 1024 * 1024 * 1024,
        usage: Math.random() * 100
      },
      network: {
        bytesIn: Math.random() * 1024 * 1024,
        bytesOut: Math.random() * 1024 * 1024,
        packetsIn: Math.random() * 10000,
        packetsOut: Math.random() * 10000
      }
    };
  }

  /**
   * Get application metrics (mock implementation)
   */
  private async getApplicationMetrics(): Promise<ApplicationMetrics> {
    // In a real implementation, this would query the application state
    return {
      timestamp: new Date(),
      activeUsers: Math.floor(Math.random() * 100) + 10,
      activeProjects: Math.floor(Math.random() * 50) + 5,
      activeContainers: Math.floor(Math.random() * 30) + 3,
      activeCollaborationSessions: Math.floor(Math.random() * 20) + 2,
      totalRequests: Math.floor(Math.random() * 10000) + 1000,
      errorRate: Math.random() * 5,
      responseTime: Math.random() * 1000 + 100,
      fileOperations: Math.floor(Math.random() * 100) + 10,
      terminalCommands: Math.floor(Math.random() * 50) + 5
    };
  }

  /**
   * Get container metrics (mock implementation)
   */
  private async getContainerMetrics(): Promise<ContainerMetrics[]> {
    // In a real implementation, this would query Docker/container runtime
    const containers: ContainerMetrics[] = [];
    
    for (let i = 0; i < 5; i++) {
      containers.push({
        containerId: `container_${i}`,
        projectId: `project_${i % 3}`,
        timestamp: new Date(),
        cpu: Math.random() * 100,
        memory: Math.random() * 1024 * 1024 * 1024,
        networkIO: Math.random() * 1024 * 1024,
        diskIO: Math.random() * 100 * 1024 * 1024,
        uptime: Math.random() * 3600,
        status: Math.random() > 0.1 ? 'running' : 'stopped'
      });
    }

    return containers;
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, userId?: string) {
    const requestsCounter = this.metrics.get('http_requests_total');
    if (requestsCounter) {
      requestsCounter.inc({ method, route, status_code: statusCode.toString(), user_id: userId || 'anonymous' });
    }

    const durationHistogram = this.metrics.get('http_request_duration_seconds');
    if (durationHistogram) {
      durationHistogram.observe({ method, route, status_code: statusCode.toString() }, duration / 1000);
    }
  }

  /**
   * Record file operation
   */
  recordFileOperation(operation: string, status: 'success' | 'error') {
    const counter = this.metrics.get('file_operations_total');
    if (counter) {
      counter.inc({ operation, status });
    }
  }

  /**
   * Record terminal command
   */
  recordTerminalCommand(exitCode: number) {
    const counter = this.metrics.get('terminal_commands_total');
    if (counter) {
      counter.inc({ exit_code: exitCode.toString() });
    }
  }

  /**
   * Record editor operation
   */
  recordEditorOperation(operation: string, userId: string) {
    const counter = this.metrics.get('editor_operations_total');
    if (counter) {
      counter.inc({ operation, user_id: userId });
    }
  }

  /**
   * Record collaboration event
   */
  recordCollaborationEvent(eventType: string, sessionId: string) {
    const counter = this.metrics.get('collaboration_events_total');
    if (counter) {
      counter.inc({ event_type: eventType, session_id: sessionId });
    }
  }

  /**
   * Update WebSocket connections
   */
  updateWebSocketConnections(type: 'ide' | 'collaboration' | 'metrics', count: number) {
    const gauge = this.metrics.get('websocket_connections_total');
    if (gauge) {
      gauge.set({ type }, count);
    }
  }

  /**
   * Update system metrics manually
   */
  async updateSystemMetrics() {
    await this.collectSystemMetrics();
  }

  /**
   * Update application metrics manually
   */
  async updateApplicationMetrics() {
    await this.collectApplicationMetrics();
  }

  /**
   * Update container metrics manually
   */
  async updateContainerMetrics() {
    await this.collectContainerMetrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsAsJson() {
    await this.updateSystemMetrics();
    await this.updateApplicationMetrics();
    await this.updateContainerMetrics();
    
    return {
      system: await this.getSystemMetrics(),
      application: await this.getApplicationMetrics(),
      containers: await this.getContainerMetrics(),
    };
  }

  /**
   * Stop metrics collection
   */
  updateWebSocketConnections(type: string, count: number) {
    const gauge = this.metrics.get('websocket_connections_total');
    if (gauge) {
      gauge.set({ type }, count);
    }
  }

  /**
   * Get metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  /**
   * Get metrics summary
   */
  async getMetricsSummary(): Promise<any> {
    const systemMetrics = await this.getSystemMetrics();
    const applicationMetrics = await this.getApplicationMetrics();
    const containerMetrics = await this.getContainerMetrics();

    return {
      timestamp: new Date(),
      system: systemMetrics,
      application: applicationMetrics,
      containers: containerMetrics,
      summary: {
        totalContainers: containerMetrics.length,
        runningContainers: containerMetrics.filter(c => c.status === 'running').length,
        averageCpuUsage: containerMetrics.reduce((sum, c) => sum + c.cpu, 0) / containerMetrics.length,
        averageMemoryUsage: containerMetrics.reduce((sum, c) => sum + c.memory, 0) / containerMetrics.length
      }
    };
  }

  /**
   * Stop metrics collection
   */
  stop() {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    if (this.applicationMetricsInterval) {
      clearInterval(this.applicationMetricsInterval);
    }
    if (this.containerMetricsInterval) {
      clearInterval(this.containerMetricsInterval);
    }
  }
}

// Singleton instance and getter function
let instance: PrometheusMetricsCollector | null = null;

export function getMetricsCollector(): PrometheusMetricsCollector {
  if (!instance) {
    instance = new PrometheusMetricsCollector();
  }
  return instance;
}

export const prometheusMetricsCollector = getMetricsCollector();

export default PrometheusMetricsCollector;