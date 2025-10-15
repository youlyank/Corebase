import Redis from "ioredis";
import { db } from "@/lib/db";

const pub = new Redis(process.env.REDIS_URL!);
const sub = new Redis(process.env.REDIS_URL!);

export const publish = async (channel: string, event: any) => {
  try {
    // Publish to Redis
    await pub.publish(channel, JSON.stringify(event));
    
    // Persist critical events to database
    if (shouldPersistEvent(event)) {
      await persistEvent(event);
    }
  } catch (error) {
    console.error("Failed to publish event:", error);
  }
};

export const subscribe = (channel: string, handler: (e: any) => void) => {
  sub.subscribe(channel);
  sub.on("message", (ch, msg) => {
    if (ch === channel) {
      try {
        const event = JSON.parse(msg);
        handler(event);
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    }
  });
};

// Determine if event should be persisted
const shouldPersistEvent = (event: any): boolean => {
  const criticalEvents = [
    "container.status",
    "file.saved", 
    "health.update",
    "activity.log"
  ];
  
  return criticalEvents.includes(event.type) && 
         event.projectId && 
         (event.data || event.payload);
};

// Persist event to database
const persistEvent = async (event: any) => {
  try {
    await db.runtimeEvent.create({
      data: {
        projectId: event.projectId,
        type: event.type,
        payload: event.data || event.payload || {}
      }
    });
    
    console.log(`Persisted event ${event.type} for project ${event.projectId}`);
  } catch (error) {
    console.error("Failed to persist event:", error);
  }
};

// Query events from database
export const getEvents = async (projectId: string, limit: number = 50) => {
  try {
    return await db.runtimeEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return [];
  }
};

// Cleanup old events (older than 7 days)
export const cleanupOldEvents = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const result = await db.runtimeEvent.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    });
    
    console.log(`Cleaned up ${result.count} old events`);
  } catch (error) {
    console.error("Failed to cleanup old events:", error);
  }
};