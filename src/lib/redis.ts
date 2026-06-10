import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

// Define local interfaces that match Upstash Redis/Ratelimit shapes
export interface RedisClient {
  get: <T = any>(key: string) => Promise<T | null>
  set: (key: string, value: any, options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean }) => Promise<'OK' | null>
  incr: (key: string) => Promise<number>
  hget: <T = any>(key: string, field: string) => Promise<T | null>
  hset: (key: string, data: Record<string, any>) => Promise<number>
  hincrby: (key: string, field: string, increment: number) => Promise<number>
  hdel: (key: string, ...fields: string[]) => Promise<number>
}

export interface RateLimiter {
  limit: (identifier: string) => Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }>
}

let redis: RedisClient
let ratelimit: RateLimiter

if (isRedisConfigured) {
  const realRedis = Redis.fromEnv()
  redis = realRedis as unknown as RedisClient

  ratelimit = new Ratelimit({
    redis: realRedis,
    limiter: Ratelimit.slidingWindow(20, '10 s'), // 20 requests per 10 seconds
    analytics: true,
  })
} else {
  // Local in-memory mock store for development
  const store = new Map<string, any>()
  const hashStore = new Map<string, Map<string, any>>()

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️ Upstash Redis credentials not configured. Falling back to local in-memory store.'
    )
  }

  redis = {
    get: async <T = any>(key: string): Promise<T | null> => {
      const val = store.get(key)
      return val !== undefined ? (val as T) : null
    },
    set: async (key: string, value: any): Promise<'OK'> => {
      store.set(key, value)
      return 'OK'
    },
    incr: async (key: string): Promise<number> => {
      const current = Number(store.get(key) || 0)
      const next = current + 1
      store.set(key, next)
      return next
    },
    hget: async <T = any>(key: string, field: string): Promise<T | null> => {
      const map = hashStore.get(key)
      if (!map) return null
      const val = map.get(field)
      return val !== undefined ? (val as T) : null
    },
    hset: async (key: string, data: Record<string, any>): Promise<number> => {
      let map = hashStore.get(key)
      if (!map) {
        map = new Map<string, any>()
        hashStore.set(key, map)
      }
      let added = 0
      for (const [k, v] of Object.entries(data)) {
        if (!map.has(k)) added++
        map.set(k, v)
      }
      return added
    },
    hincrby: async (key: string, field: string, increment: number): Promise<number> => {
      let map = hashStore.get(key)
      if (!map) {
        map = new Map<string, any>()
        hashStore.set(key, map)
      }
      const current = Number(map.get(field) || 0)
      const next = current + increment
      map.set(field, next)
      return next
    },
    hdel: async (key: string, ...fields: string[]): Promise<number> => {
      const map = hashStore.get(key)
      if (!map) return 0
      let deleted = 0
      for (const field of fields) {
        if (map.has(field)) {
          map.delete(field)
          deleted++
        }
      }
      return deleted
    }
  }

  // Local sliding window rate limiter fallback
  const rateLimitHits = new Map<string, number[]>()

  ratelimit = {
    limit: async (identifier: string) => {
      const now = Date.now()
      const windowMs = 10000 // 10s window
      const limit = 20 // limit to 20 hits per window
      
      let timestamps = rateLimitHits.get(identifier) || []
      // Filter out timestamps outside current window
      timestamps = timestamps.filter((t) => now - t < windowMs)
      
      const success = timestamps.length < limit
      if (success) {
        timestamps.push(now)
      }
      rateLimitHits.set(identifier, timestamps)

      return {
        success,
        limit,
        remaining: Math.max(0, limit - timestamps.length),
        reset: now + windowMs,
      }
    }
  }
}

export { redis, ratelimit, isRedisConfigured }
