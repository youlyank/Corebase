import Redis from "ioredis";
import { db } from "@/lib/db";
import { ProjectEvent } from "./types";

export interface EventSubscription {
  id: string;
  projectId: string;
  userId?: string;
  eventTypes: string[];
  handler: (event: ProjectEvent) => void;
  createdAt: Date;
}

export interface ProjectEventBus {
  projectId: string;
  subscribers: Map<string, EventSubscription>;
  eventHistory: ProjectEvent[];
  maxHistorySize: number;
}

export class ProjectEventBusManager {
  private buses = new Map<string, ProjectEventBus>();
  private pub: Redis;
  private sub: Redis;
  private subscriptions = new Map<string, EventSubscription>();

  constructor() {
    this.pub = new Redis(process.env.REDIS_URL!);
    this.sub = new Redis(process.env.REDIS_URL!);
    
    // Listen for project events from Redis
    this.sub.psubscribe("project:*");
    this.sub.on("pmessage", (pattern, channel, message) => {
      try {
        const event: ProjectEvent = JSON.parse(message);
        this.handleProjectEvent(event);
      } catch (error) {
        console.error("Failed to parse project event:", error);
      }
    });
  }

  /**
   * Get or create event bus for a project
   */
  getProjectBus(projectId: string): ProjectEventBus {
    if (!this.buses.has(projectId)) {
      this.buses.set(projectId, {
        projectId,
        subscribers: new Map(),
        eventHistory: [],
        maxHistorySize: 1000
      });
    }
    return this.buses.get(projectId)!;
  }

  /**
   * Publish event to project bus
   */
  async publishEvent(event: ProjectEvent): Promise<void> {
    try {
      // Publish to Redis for cross-process communication
      await this.pub.publish(`project:${event.projectId}`, JSON.stringify(event));
      
      // Handle locally
      this.handleProjectEvent(event);
      
      // Persist critical events
      if (this.shouldPersistEvent(event)) {
        await this.persistEvent(event);
      }
    } catch (error) {
      console.error("Failed to publish project event:", error);
    }
  }

  /**
   * Handle incoming project event
   */
  private handleProjectEvent(event: ProjectEvent): void {
    const bus = this.getProjectBus(event.projectId);
    
    // Add to history
    bus.eventHistory.push(event);
    if (bus.eventHistory.length > bus.maxHistorySize) {
      bus.eventHistory.shift();
    }
    
    // Notify subscribers
    for (const subscription of bus.subscribers.values()) {
      if (this.shouldNotifySubscriber(subscription, event)) {
        try {
          subscription.handler(event);
        } catch (error) {
          console.error("Error in event handler:", error);
        }
      }
    }
    
    // Notify global subscribers
    for (const subscription of this.subscriptions.values()) {
      if (this.shouldNotifySubscriber(subscription, event)) {
        try {
          subscription.handler(event);
        } catch (error) {
          console.error("Error in global event handler:", error);
        }
      }
    }
  }

  /**
   * Subscribe to project events
   */
  subscribeToProject(
    projectId: string, 
    eventTypes: string[], 
    handler: (event: ProjectEvent) => void,
    userId?: string
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      projectId,
      userId,
      eventTypes,
      handler,
      createdAt: new Date()
    };
    
    const bus = this.getProjectBus(projectId);
    bus.subscribers.set(subscriptionId, subscription);
    
    return subscriptionId;
  }

  /**
   * Subscribe to events across all projects
   */
  subscribeToAllProjects(
    eventTypes: string[], 
    handler: (event: ProjectEvent) => void,
    userId?: string
  ): string {
    const subscriptionId = `global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      projectId: '*', // Wildcard for all projects
      userId,
      eventTypes,
      handler,
      createdAt: new Date()
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    // Remove from project buses
    for (const bus of this.buses.values()) {
      bus.subscribers.delete(subscriptionId);
    }
    
    // Remove from global subscriptions
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get event history for a project
   */
  getEventHistory(projectId: string, eventTypes?: string[], limit?: number): ProjectEvent[] {
    const bus = this.getProjectBus(projectId);
    let history = bus.eventHistory;
    
    if (eventTypes && eventTypes.length > 0) {
      history = history.filter(event => eventTypes.includes(event.type));
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Get active users in a project
   */
  getActiveUsers(projectId: string): string[] {
    const bus = this.getProjectBus(projectId);
    const users = new Set<string>();
    
    // Get users from recent events
    const recentEvents = bus.eventHistory.slice(-100); // Last 100 events
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    for (const event of recentEvents) {
      if ('userId' in event && event.userId) {
        // Check if user has recent activity
        const userEvents = recentEvents.filter(e => 
          'userId' in e && e.userId === event.userId
        );
        
        if (userEvents.length > 0) {
          users.add(event.userId);
        }
      }
    }
    
    return Array.from(users);
  }

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): {
    totalEvents: number;
    activeUsers: number;
    eventTypes: Record<string, number>;
    lastActivity: Date | null;
  } {
    const bus = this.getProjectBus(projectId);
    const eventTypes: Record<string, number> = {};
    
    for (const event of bus.eventHistory) {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    }
    
    const lastActivity = bus.eventHistory.length > 0 
      ? new Date(bus.eventHistory[bus.eventHistory.length - 1].timestamp || Date.now())
      : null;
    
    return {
      totalEvents: bus.eventHistory.length,
      activeUsers: this.getActiveUsers(projectId).length,
      eventTypes,
      lastActivity
    };
  }

  /**
   * Check if subscriber should be notified
   */
  private shouldNotifySubscriber(subscription: EventSubscription, event: ProjectEvent): boolean {
    // Check project filter
    if (subscription.projectId !== '*' && subscription.projectId !== event.projectId) {
      return false;
    }
    
    // Check event type filter
    if (subscription.eventTypes.length > 0 && !subscription.eventTypes.includes(event.type)) {
      return false;
    }
    
    // Check user filter (if specified)
    if (subscription.userId && 'userId' in event && event.userId !== subscription.userId) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if event should be persisted
   */
  private shouldPersistEvent(event: ProjectEvent): boolean {
    const persistableEvents = [
      'collaboration.user_joined',
      'collaboration.user_left',
      'collaboration.file_changed',
      'workspace.snapshot_created',
      'workspace.snapshot_restored',
      'ide.file_saved',
      'container.status'
    ];
    
    return persistableEvents.includes(event.type);
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: ProjectEvent): Promise<void> {
    try {
      await db.runtimeEvent.create({
        data: {
          projectId: event.projectId,
          type: event.type,
          payload: event.data || event
        }
      });
    } catch (error) {
      console.error("Failed to persist event:", error);
    }
  }

  /**
   * Clean up old events and inactive subscriptions
   */
  async cleanup(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Clean up old subscriptions
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.createdAt < oneHourAgo) {
        this.subscriptions.delete(id);
      }
    }
    
    for (const bus of this.buses.values()) {
      for (const [id, subscription] of bus.subscribers.entries()) {
        if (subscription.createdAt < oneHourAgo) {
          bus.subscribers.delete(id);
        }
      }
    }
    
    // Clean up old event history (keep last 1000 events)
    for (const bus of this.buses.values()) {
      if (bus.eventHistory.length > bus.maxHistorySize) {
        bus.eventHistory = bus.eventHistory.slice(-bus.maxHistorySize);
      }
    }
  }

  /**
   * Get all active project buses
   */
  getAllBuses(): ProjectEventBus[] {
    return Array.from(this.buses.values());
  }

  /**
   * Shutdown the event bus manager
   */
  async shutdown(): Promise<void> {
    await this.pub.quit();
    await this.sub.quit();
    this.buses.clear();
    this.subscriptions.clear();
  }
}

// Singleton instance
export const projectEventBusManager = new ProjectEventBusManager();