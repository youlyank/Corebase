import { EventEmitter } from 'events';
import { runtimeService } from './runtime-service';
import { db } from '@/lib/db';

export interface RuntimeMetrics {
  timestamp: Date;
  totalContainers: number;
  runningContainers: number;
  stoppedContainers: number;
  errorContainers: number;
  totalMemoryUsage: number;
  totalCpuUsage: number;
  networkIO: {
    totalRx: number;
    totalTx: number;
  };
  userMetrics: {
    userId: string;
    containerCount: number;
    memoryUsage: number;
    cpuUsage: number;
  }[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: 'memory_usage' | 'cpu_usage' | 'container_count' | 'disk_usage';
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  userId?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: any;
}

export class RuntimeMonitoring extends EventEmitter {
  private static instance: RuntimeMonitoring;
  private isMonitoring = false;
  private metrics: RuntimeMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;
  private alertInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.setupDefaultAlertRules();
  }

  static getInstance(): RuntimeMonitoring {
    if (!RuntimeMonitoring.instance) {
      RuntimeMonitoring.instance = new RuntimeMonitoring();
    }
    return RuntimeMonitoring.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 30000);

    // Check alerts every 60 seconds
    this.alertInterval = setInterval(async () => {
      await this.checkAlerts();
    }, 60000);

    console.log('Runtime monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }

    console.log('Runtime monitoring stopped');
  }

  async collectMetrics(): Promise<RuntimeMetrics> {
    try {
      // Get container counts from database
      const totalContainers = await db.container.count();
      const runningContainers = await db.container.count({
        where: { status: 'RUNNING' }
      });
      const stoppedContainers = await db.container.count({
        where: { status: 'STOPPED' }
      });
      const errorContainers = await db.container.count({
        where: { status: 'ERROR' }
      });

      // Get per-user metrics
      const userContainerStats = await db.container.groupBy({
        by: ['userId'],
        where: { status: 'RUNNING' },
        _count: { id: true }
      });

      // Calculate resource usage (simplified for demo)
      const totalMemoryUsage = runningContainers * (512 * 1024 * 1024); // 512MB per container
      const totalCpuUsage = runningContainers * 10; // 10% per container

      const metrics: RuntimeMetrics = {
        timestamp: new Date(),
        totalContainers,
        runningContainers,
        stoppedContainers,
        errorContainers,
        totalMemoryUsage,
        totalCpuUsage,
        networkIO: {
          totalRx: Math.floor(Math.random() * 1000000), // Mock data
          totalTx: Math.floor(Math.random() * 1000000)  // Mock data
        },
        userMetrics: userContainerStats.map(stat => ({
          userId: stat.userId,
          containerCount: stat._count.id,
          memoryUsage: stat._count.id * (512 * 1024 * 1024),
          cpuUsage: stat._count.id * 10
        }))
      };

      // Store metrics (keep last 1000 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // Store in database
      await this.storeMetrics(metrics);

      // Emit metrics event
      this.emit('metrics', metrics);

      return metrics;

    } catch (error) {
      console.error('Error collecting metrics:', error);
      throw error;
    }
  }

  async getMetrics(timeRange?: { start: Date; end: Date }): Promise<RuntimeMetrics[]> {
    if (!timeRange) {
      return this.metrics;
    }

    return this.metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  async getUserMetrics(userId: string, timeRange?: { start: Date; end: Date }): Promise<RuntimeMetrics[]> {
    const metrics = await this.getMetrics(timeRange);
    return metrics.filter(m => 
      m.userMetrics.some(um => um.userId === userId)
    );
  }

  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const alertRule: AlertRule = {
      ...rule,
      id: Math.random().toString(36).substring(7)
    };

    this.alertRules.set(alertRule.id, alertRule);
    await this.saveAlertRule(alertRule);

    return alertRule;
  }

  async removeAlertRule(ruleId: string): Promise<void> {
    this.alertRules.delete(ruleId);
    await this.deleteAlertRule(ruleId);
  }

  async getAlertRules(userId?: string): Promise<AlertRule[]> {
    const rules = Array.from(this.alertRules.values());
    return userId ? rules.filter(r => r.userId === userId || !r.userId) : rules;
  }

  async getActiveAlerts(userId?: string): Promise<Alert[]> {
    const alerts = Array.from(this.activeAlerts.values());
    return userId ? alerts.filter(a => !a.resolved && (!a.metadata?.userId || a.metadata.userId === userId)) : alerts;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      await this.updateAlert(alert);
      this.emit('alert:resolved', alert);
    }
  }

  private async checkAlerts(): Promise<void> {
    try {
      const currentMetrics = this.metrics[this.metrics.length - 1];
      if (!currentMetrics) return;

      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) continue;

        const triggered = await this.evaluateAlertRule(rule, currentMetrics);
        const alertKey = `${rule.id}_${rule.userId || 'global'}`;

        if (triggered && !this.activeAlerts.has(alertKey)) {
          // Create new alert
          const alert: Alert = {
            id: Math.random().toString(36).substring(7),
            ruleId: rule.id,
            message: this.generateAlertMessage(rule, currentMetrics),
            severity: rule.severity,
            timestamp: new Date(),
            resolved: false,
            metadata: {
              rule,
              metrics: currentMetrics,
              userId: rule.userId
            }
          };

          this.activeAlerts.set(alertKey, alert);
          await this.saveAlert(alert);
          this.emit('alert:triggered', alert);

        } else if (!triggered && this.activeAlerts.has(alertKey)) {
          // Resolve alert
          await this.resolveAlert(this.activeAlerts.get(alertKey)!.id);
        }
      }

    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  private async evaluateAlertRule(rule: AlertRule, metrics: RuntimeMetrics): Promise<boolean> {
    let value = 0;

    switch (rule.condition) {
      case 'memory_usage':
        value = metrics.totalMemoryUsage;
        break;
      case 'cpu_usage':
        value = metrics.totalCpuUsage;
        break;
      case 'container_count':
        value = metrics.runningContainers;
        break;
      case 'disk_usage':
        // Mock disk usage
        value = Math.floor(Math.random() * 100);
        break;
    }

    switch (rule.operator) {
      case '>':
        return value > rule.threshold;
      case '<':
        return value < rule.threshold;
      case '=':
        return value === rule.threshold;
      case '>=':
        return value >= rule.threshold;
      case '<=':
        return value <= rule.threshold;
      default:
        return false;
    }
  }

  private generateAlertMessage(rule: AlertRule, metrics: RuntimeMetrics): string {
    let value = 0;
    let unit = '';

    switch (rule.condition) {
      case 'memory_usage':
        value = metrics.totalMemoryUsage / (1024 * 1024 * 1024); // GB
        unit = 'GB';
        break;
      case 'cpu_usage':
        value = metrics.totalCpuUsage;
        unit = '%';
        break;
      case 'container_count':
        value = metrics.runningContainers;
        unit = 'containers';
        break;
      case 'disk_usage':
        value = Math.floor(Math.random() * 100);
        unit = '%';
        break;
    }

    return `${rule.name}: ${value}${unit} ${rule.operator} ${rule.threshold}${unit}`;
  }

  private setupDefaultAlertRules(): void {
    // Default system-wide alert rules
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Memory Usage',
        condition: 'memory_usage',
        operator: '>',
        threshold: 8 * 1024 * 1024 * 1024, // 8GB
        severity: 'high',
        enabled: true
      },
      {
        name: 'High CPU Usage',
        condition: 'cpu_usage',
        operator: '>',
        threshold: 80, // 80%
        severity: 'medium',
        enabled: true
      },
      {
        name: 'Too Many Running Containers',
        condition: 'container_count',
        operator: '>',
        threshold: 50,
        severity: 'medium',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      const alertRule: AlertRule = {
        ...rule,
        id: Math.random().toString(36).substring(7)
      };
      this.alertRules.set(alertRule.id, alertRule);
    });
  }

  private async storeMetrics(metrics: RuntimeMetrics): Promise<void> {
    try {
      // Store aggregated metrics in database
      await Promise.all([
        db.runtimeMetric.create({
          data: {
            containerId: 'system',
            metricType: 'total_containers',
            value: metrics.totalContainers,
            unit: 'count',
            timestamp: metrics.timestamp
          }
        }),
        db.runtimeMetric.create({
          data: {
            containerId: 'system',
            metricType: 'running_containers',
            value: metrics.runningContainers,
            unit: 'count',
            timestamp: metrics.timestamp
          }
        }),
        db.runtimeMetric.create({
          data: {
            containerId: 'system',
            metricType: 'memory_usage',
            value: metrics.totalMemoryUsage,
            unit: 'bytes',
            timestamp: metrics.timestamp
          }
        }),
        db.runtimeMetric.create({
          data: {
            containerId: 'system',
            metricType: 'cpu_usage',
            value: metrics.totalCpuUsage,
            unit: 'percent',
            timestamp: metrics.timestamp
          }
        })
      ]);
    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }

  private async saveAlertRule(rule: AlertRule): Promise<void> {
    // In a real implementation, save to database
    console.log('Alert rule saved:', rule);
  }

  private async deleteAlertRule(ruleId: string): Promise<void> {
    // In a real implementation, delete from database
    console.log('Alert rule deleted:', ruleId);
  }

  private async saveAlert(alert: Alert): Promise<void> {
    // In a real implementation, save to database
    console.log('Alert saved:', alert);
  }

  private async updateAlert(alert: Alert): Promise<void> {
    // In a real implementation, update in database
    console.log('Alert updated:', alert);
  }
}

export const runtimeMonitoring = RuntimeMonitoring.getInstance();
export default runtimeMonitoring;