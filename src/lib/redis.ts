import { Redis } from '@upstash/redis'

const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

// Define local interfaces that match Upstash Redis shapes
export interface RedisClient {
  get: <T = any>(key: string) => Promise<T | null>
  set: (key: string, value: any, options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean }) => Promise<'OK' | null>
  incr: (key: string) => Promise<number>
  expire: (key: string, seconds: number) => Promise<number>
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

if (isRedisConfigured) {
  const realRedis = Redis.fromEnv()
  redis = realRedis as unknown as RedisClient
} else {
  // Local in-memory mock store for development — simule un vrai TTL (via
  // expiryAt) pour que le limiteur par fenêtre fixe ci-dessous se comporte
  // à l'identique en local et en production.
  const store = new Map<string, any>()
  const expiryAt = new Map<string, number>()
  const hashStore = new Map<string, Map<string, any>>()

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️ Upstash Redis credentials not configured. Falling back to local in-memory store.'
    )
  }

  const dropIfExpired = (key: string) => {
    const exp = expiryAt.get(key)
    if (exp !== undefined && Date.now() > exp) {
      store.delete(key)
      expiryAt.delete(key)
    }
  }

  redis = {
    get: async <T = any>(key: string): Promise<T | null> => {
      dropIfExpired(key)
      const val = store.get(key)
      return val !== undefined ? (val as T) : null
    },
    set: async (key: string, value: any, options?: { ex?: number }): Promise<'OK'> => {
      store.set(key, value)
      if (options?.ex) expiryAt.set(key, Date.now() + options.ex * 1000)
      return 'OK'
    },
    incr: async (key: string): Promise<number> => {
      dropIfExpired(key)
      const current = Number(store.get(key) || 0)
      const next = current + 1
      store.set(key, next)
      return next
    },
    expire: async (key: string, seconds: number): Promise<number> => {
      if (!store.has(key)) return 0
      expiryAt.set(key, Date.now() + seconds * 1000)
      return 1
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
}

// Limiteur par fenêtre fixe (INCR + EXPIRE) — commandes Redis de base,
// autorisées par tout token, à la différence de l'ancien algorithme "sliding
// window" (@upstash/ratelimit) qui reposait sur EVALSHA/Lua et échouait
// silencieusement en production faute de cette permission sur le token
// configuré. Ne catch jamais les erreurs ici : une panne Redis (réseau,
// permissions, etc.) doit remonter telle quelle à l'appelant, qui décide du
// comportement fail-closed (voir server/trpc.ts et server/routers/_app.ts —
// aucun des deux n'utilise plus le mode "on autorise si Redis échoue").
function createFixedWindowRateLimiter(limit: number, windowSeconds: number, keyPrefix: string): RateLimiter {
  return {
    limit: async (identifier: string) => {
      const key = `${keyPrefix}:${identifier}`
      const count = await redis.incr(key)
      if (count === 1) {
        // Ne pose le TTL qu'à la création du compteur, pas à chaque appel —
        // sinon la fenêtre glisserait indéfiniment au lieu d'être fixe.
        await redis.expire(key, windowSeconds)
      }
      return {
        success: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        reset: Date.now() + windowSeconds * 1000,
      }
    },
  }
}

// Limiteur générique existant (ex: spinRoulette) : 20 requêtes / 10 secondes.
const ratelimit: RateLimiter = createFixedWindowRateLimiter(20, 10, 'ratelimit')

// Limiteur dédié aux formulaires publics sensibles (inscription partenaire,
// inscription/connexion client) : 3 tentatives par identifiant (IP préfixée
// par l'action) et par heure.
const authRatelimit: RateLimiter = createFixedWindowRateLimiter(3, 60 * 60, 'authratelimit')

// Limiteur dédié à la CONNEXION client. Contrairement à authRatelimit (clé par
// IP), on limite par COMPTE (email) : les tentatives d'un client ne bloquent
// pas les autres, et plusieurs clients derrière une même IP (box/4G/entreprise)
// ne se partagent plus un quota commun. 8 tentatives / 15 min et par email.
const customerLoginRatelimit: RateLimiter = createFixedWindowRateLimiter(8, 15 * 60, 'customerlogin')

// Inscription client : garde une clé par IP (anti-spam de comptes), mais plus
// souple que l'ancien 3/h — 10 inscriptions par heure et par IP.
const customerSignupRatelimit: RateLimiter = createFixedWindowRateLimiter(10, 60 * 60, 'customersignup')

export { redis, ratelimit, authRatelimit, customerLoginRatelimit, customerSignupRatelimit, isRedisConfigured }
