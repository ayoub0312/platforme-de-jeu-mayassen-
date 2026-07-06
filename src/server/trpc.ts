import { initTRPC, TRPCError } from '@trpc/server'
import { ratelimit } from '../lib/redis'
import { UserSession } from '../lib/auth'

export interface Context {
  ip?: string
  userAgent?: string
  userSession?: UserSession | null
}

const t = initTRPC.context<Context>().create()

// Base router and procedures
export const router = t.router
export const publicProcedure = t.procedure

// Reusable rate limiting middleware for sensitive/heavy procedures
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const identifier = ctx.ip || 'global_rate_limit'
  let success = true
  let limit = 20
  let remaining = 20
  let reset = Date.now() + 10000

  try {
    const res = await ratelimit.limit(`trpc_limit:${identifier}`)
    success = res.success
    limit = res.limit
    remaining = res.remaining
    reset = res.reset
  } catch (err) {
    console.warn('[Redis Warning] Rate limiting failed to execute in Redis, bypassing rate limit checks:', err)
  }

  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Remaining requests: ${remaining}/${limit}. Reset in ${Math.ceil(
        (reset - Date.now()) / 1000
      )}s.`,
    })
  }

  return next()
})

export const rateLimitedProcedure = t.procedure.use(rateLimitMiddleware)

// Admin session verification middleware
const adminMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.userSession) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Non autorisé. Veuillez vous connecter.',
    })
  }
  return next({
    ctx: {
      userSession: ctx.userSession,
    },
  })
})

// SuperAdmin role verification middleware
const superAdminMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.userSession) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Non autorisé. Veuillez vous connecter.',
    })
  }
  if (ctx.userSession.role !== 'SUPERADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Action réservée aux super-administrateurs.',
    })
  }
  return next({
    ctx: {
      userSession: ctx.userSession,
    },
  })
})

export const adminProcedure = t.procedure.use(adminMiddleware)
export const superAdminProcedure = t.procedure.use(superAdminMiddleware)

// Write-access middleware: same as adminProcedure, but also blocks the
// READONLY ("Lecteur") role — use for any mutation a Lecteur must not perform.
const writeMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.userSession) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Non autorisé. Veuillez vous connecter.',
    })
  }
  if (ctx.userSession.role === 'READONLY') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Votre rôle Lecteur ne permet pas d'effectuer cette action.",
    })
  }
  return next({
    ctx: {
      userSession: ctx.userSession,
    },
  })
})

export const writeProcedure = t.procedure.use(writeMiddleware)

