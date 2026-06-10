import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/vercel'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from '@/server/routers/_app'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const runtime = 'edge'

const app = new Hono().basePath('/api')

// Dynamic CORS middleware checking Origin header against B2B domains
app.use(
  '*',
  cors({
    origin: async (origin, c) => {
      // Standard localhost or non-browser server requests allowed
      if (!origin) return '*'

      // Check for cached allowed origins in Redis
      let allowedOrigins: string[] | null = null
      try {
        allowedOrigins = await redis.get<string[]>('b2b:allowed_domains')
      } catch (err) {
        console.warn('[Redis Warning] Failed to read allowed origins from Redis:', err)
      }

      if (!allowedOrigins) {
        try {
          const partners = await prisma.partner.findMany({
            select: { allowedDomains: true },
          })

          const domains = partners.flatMap((p) =>
            p.allowedDomains.split(',').map((d) => d.trim().toLowerCase())
          )

          // Always add local development hosts to allow sandbox testing
          domains.push('localhost:3000')
          domains.push('127.0.0.1:3000')

          allowedOrigins = domains
          // Cache allowed domains in Redis
          try {
            await redis.set('b2b:allowed_domains', allowedOrigins)
          } catch (redisErr) {
            console.warn('[Redis Warning] Failed to cache allowed domains in Redis:', redisErr)
          }
        } catch (err) {
          console.error('Failed to load allowed origins from database:', err)
          // Safe fallback to localhost in case of DB connection issues
          allowedOrigins = ['localhost:3000', '127.0.0.1:3000']
        }
      }

      // Check if origin matches one of the allowed domains (cleaning protocols first)
      const cleanOrigin = origin.replace(/^https?:\/\//, '').toLowerCase()
      const isAllowed = allowedOrigins.some((domain) => {
        const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase()
        return cleanOrigin === cleanDomain || cleanOrigin.endsWith('.' + cleanDomain)
      })

      return isAllowed ? origin : null
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
)

import { getCookie } from 'hono/cookie'
import { verifySessionToken } from '@/lib/auth'

// Mount tRPC server on Hono
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c) => {
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1'
      const userAgent = c.req.header('user-agent') || 'unknown'

      const token = getCookie(c, 'admin_session')
      const userSession = await verifySessionToken(token)

      return {
        ip,
        userAgent,
        userSession,
      }
    },
  })
)

// Standard REST health check
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    runtime: 'Vercel Edge Runtime',
    timestamp: new Date().toISOString(),
  })
)

export const GET = handle(app)
export const POST = handle(app)
