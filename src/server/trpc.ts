import { initTRPC, TRPCError } from '@trpc/server'
import { ratelimit } from '../lib/redis'
import { UserSession, CustomerSession } from '../lib/auth'

export interface Context {
  ip?: string
  userAgent?: string
  userSession?: UserSession | null
  // Espace client final (voyageurs) — jamais lu par adminMiddleware/
  // superAdminMiddleware/partnerMiddleware ci-dessous, qui ne regardent que
  // userSession. Un Customer authentifié n'a donc structurellement aucun
  // moyen de passer ces procédures, même en connaissant leurs noms.
  customerSession?: CustomerSession | null
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

// Partner-or-SuperAdmin middleware: gates entry to endpoints that manage
// roulette/tirage config for a single campaign. A SUPERADMIN session passes
// through unrestricted; a PARTNER session must already have a resolved
// partnerId (set at login), and is blocked outright if their partner account
// has been deactivated in the meantime. This only gates *entry* — each
// procedure still has to load the target row and verify its own partnerId
// matches ctx.userSession.partnerId before acting on it (a valid session
// here does not imply the specific resource belongs to this partner).
const partnerMiddleware = t.middleware(async ({ ctx, next }) => {
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
  if (ctx.userSession.role === 'PARTNER' && !ctx.userSession.partnerId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Aucun partenaire associé à votre compte.',
    })
  }
  return next({
    ctx: {
      userSession: ctx.userSession,
    },
  })
})

export const partnerProcedure = t.procedure.use(partnerMiddleware)

// Espace client final — vérifie ctx.customerSession (cookie customer_session,
// jamais admin_session). Complètement indépendant des middlewares admin
// ci-dessus : n'accorde jamais, même indirectement, l'accès à adminProcedure/
// superAdminProcedure/partnerProcedure, qui ne lisent que ctx.userSession.
const customerMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.customerSession) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Non autorisé. Veuillez vous connecter.',
    })
  }
  return next({
    ctx: {
      customerSession: ctx.customerSession,
    },
  })
})

export const customerProcedure = t.procedure.use(customerMiddleware)

