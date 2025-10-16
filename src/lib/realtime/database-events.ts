import { EventEmitter } from 'events';

export interface DatabaseEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: any;
  timestamp: string;
  userId?: string;
}

export class DatabaseEventService extends EventEmitter {
  private static instance: DatabaseEventService;
  private events: DatabaseEvent[] = [];
  private maxEvents = 1000;

  private constructor() {
    super();
  }

  static getInstance(): DatabaseEventService {
    if (!DatabaseEventService.instance) {
      DatabaseEventService.instance = new DatabaseEventService();
    }
    return DatabaseEventService.instance;
  }

  startListening(): void {
    console.log('Database event listener started');
    
    // In a real implementation, this would connect to PostgreSQL's logical replication
    // or use database triggers to capture changes
    
    // For demo purposes, we'll simulate some database events
    this.simulateEvents();
  }

  stopListening(): void {
    console.log('Database event listener stopped');
    this.removeAllListeners();
  }

  async publishEvent(event: DatabaseEvent): Promise<void> {
    // Add to events buffer
    this.events.unshift(event);
    
    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Emit to listeners
    this.emit('database-change', event);
    
    console.log(`Database event published: ${event.type} on ${event.table}`);
  }

  async getRecentEvents(tableName?: string, limit: number = 50): Promise<DatabaseEvent[]> {
    let filteredEvents = this.events;
    
    if (tableName) {
      filteredEvents = this.events.filter(event => event.table === tableName);
    }
    
    return filteredEvents.slice(0, limit);
  }

  async getEventsByUser(userId: string, limit: number = 50): Promise<DatabaseEvent[]> {
    return this.events
      .filter(event => event.userId === userId)
      .slice(0, limit);
  }

  async getEventStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByTable: Record<string, number>;
    recentActivity: DatabaseEvent[];
  }> {
    const eventsByType: Record<string, number> = {};
    const eventsByTable: Record<string, number> = {};

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByTable[event.table] = (eventsByTable[event.table] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsByTable,
      recentActivity: this.events.slice(0, 10)
    };
  }

  clearEvents(): void {
    this.events = [];
    console.log('Database events cleared');
  }

  private simulateEvents(): void {
    // Simulate random database events for demonstration
    const tables = ['users', 'projects', 'files', 'api_keys', 'audit_logs'];
    const eventTypes: DatabaseEvent['type'][] = ['INSERT', 'UPDATE', 'DELETE'];
    
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of an event
        const event: DatabaseEvent = {
          type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          table: tables[Math.floor(Math.random() * tables.length)],
          schema: 'public',
          record: {
            id: Math.random().toString(36).substring(7),
            data: `sample_data_${Date.now()}`,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };

        this.publishEvent(event);
      }
    }, 5000); // Check every 5 seconds
  }
}

export default DatabaseEventService;