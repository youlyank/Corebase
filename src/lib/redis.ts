import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    })

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    redisClient.on('connect', () => {
      console.log('Redis Client Connected')
    })

    try {
      await redisClient.connect()
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      // In development, we can continue without Redis
      redisClient = null
    }
  }

  return redisClient
}

export class RedisService {
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const client = await getRedisClient()
      if (client) {
        const serializedValue = JSON.stringify(value)
        if (ttl) {
          await client.setEx(key, ttl, serializedValue)
        } else {
          await client.set(key, serializedValue)
        }
      }
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient()
      if (client) {
        const value = await client.get(key)
        return value ? JSON.parse(value) : null
      }
      return null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  static async del(key: string): Promise<void> {
    try {
      const client = await getRedisClient()
      if (client) {
        await client.del(key)
      }
    } catch (error) {
      console.error('Redis del error:', error)
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      if (client) {
        const result = await client.exists(key)
        return result === 1
      }
      return false
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  }

  static async incr(key: string): Promise<number> {
    try {
      const client = await getRedisClient()
      if (client) {
        return await client.incr(key)
      }
      return 0
    } catch (error) {
      console.error('Redis incr error:', error)
      return 0
    }
  }

  static async expire(key: string, ttl: number): Promise<void> {
    try {
      const client = await getRedisClient()
      if (client) {
        await client.expire(key, ttl)
      }
    } catch (error) {
      console.error('Redis expire error:', error)
    }
  }

  // Session management
  static async setSession(sessionId: string, sessionData: any, ttl: number = 7 * 24 * 60 * 60): Promise<void> {
    await this.set(`session:${sessionId}`, sessionData, ttl)
  }

  static async getSession(sessionId: string): Promise<any> {
    return await this.get(`session:${sessionId}`)
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`)
  }

  // Rate limiting
  static async checkRateLimit(identifier: string, limit: number, window: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`
    const current = await this.incr(key)
    
    if (current === 1) {
      await this.expire(key, window)
    }
    
    return current <= limit
  }

  // Cache management
  static async cacheApiResponse(key: string, data: any, ttl: number = 300): Promise<void> {
    await this.set(`api_cache:${key}`, data, ttl)
  }

  static async getCachedApiResponse<T>(key: string): Promise<T | null> {
    return await this.get(`api_cache:${key}`)
  }

  static async invalidateCachePattern(pattern: string): Promise<void> {
    try {
      const client = await getRedisClient()
      if (client) {
        const keys = await client.keys(pattern)
        if (keys.length > 0) {
          await client.del(keys)
        }
      }
    } catch (error) {
      console.error('Redis invalidate pattern error:', error)
    }
  }
}