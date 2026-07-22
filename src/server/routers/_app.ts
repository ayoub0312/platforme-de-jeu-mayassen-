import { z } from 'zod'
import { router, publicProcedure, rateLimitedProcedure, adminProcedure, superAdminProcedure, writeProcedure, partnerProcedure, customerProcedure } from '../trpc'
import { prisma } from '../../lib/db'
import crypto from 'crypto'
import { redis, authRatelimit, customerLoginRatelimit } from '../../lib/redis'
import { TRPCError } from '@trpc/server'
import { TokenStatus, EarnMethod, PrizeType, Prize, Role } from '@prisma/client'
import { createSessionToken, createCustomerSessionToken } from '../../lib/auth'
import bcrypt from 'bcryptjs'
import { encryptSecret } from '../../lib/crypto'
import { sendWinnerEmail, sendDrawRegistrationEmail, sendCustomerPasswordResetEmail } from '../../lib/mailer'

// Jetons de jeu valides pendant 90 jours après leur création
const TOKEN_VALIDITY_DAYS = 90

// Résout l'adresse/mot de passe d'envoi à utiliser pour notifier un gagnant :
// priorité à l'adresse propre de la campagne, sinon repli sur l'adresse par
// défaut de l'agence configurée dans Réglages. Retourne null si aucune des
// deux n'est configurée (l'appelant doit alors simplement sauter l'envoi).
async function resolveSenderCredentials(campaign: { senderEmail: string | null; senderEmailPassword: string | null }) {
  if (campaign.senderEmail && campaign.senderEmailPassword) {
    return { senderEmail: campaign.senderEmail, senderEmailPassword: campaign.senderEmailPassword }
  }
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } })
  if (settings?.defaultSenderEmail && settings?.defaultSenderEmailPassword) {
    return { senderEmail: settings.defaultSenderEmail, senderEmailPassword: settings.defaultSenderEmailPassword }
  }
  return null
}

// Journalise une action admin (création/édition/publication de campagne, changement
// de statut d'un gagnant, etc.). Ne doit jamais faire échouer l'action journalisée.
async function logActivity(params: {
  userEmail: string
  action: string
  targetType: string
  targetId: string
  partnerId?: string
}) {
  try {
    await prisma.activityLog.create({ data: params })
  } catch (err) {
    console.warn('[ActivityLog Warning] Failed to record activity log entry:', err)
  }
}

// Génère un slug URL-safe unique à partir du nom d'un partenaire (ex: "Tout
// est là" -> "tout-est-la"), en ajoutant un suffixe numérique en cas de
// collision avec un slug existant.
async function generateUniquePartnerSlug(name: string): Promise<string> {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'partenaire'
  let slug = base
  let suffix = 1
  while (await prisma.partner.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }
  return slug
}

// Mot de passe temporaire cryptographiquement sûr pour un compte partenaire
// nouvellement créé ou réinitialisé — jamais stocké ni loggé en clair, retourné
// une seule fois dans la réponse de la mutation qui l'a généré.
function generateSecurePassword(length = 16): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length]
  return out
}

// Code de bon de réduction lisible (sans caractères ambigus I/O/0/1), format
// OB-XXXX-XXXX. L'unicité est garantie par la contrainte @unique + retry.
function generateVoucherCode(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) out += charset[bytes[i] % charset.length]
  return `OB-${out.slice(0, 4)}-${out.slice(4, 8)}`
}

// Vérifie une force minimale pour les mots de passe choisis par l'utilisateur
// lui-même sur les formulaires publics (auto-inscription partenaire,
// inscription client) — au-delà de la longueur, exige une diversité de
// caractères. Retourne un message d'erreur, ou null si le mot de passe passe.
function checkPasswordStrength(password: string): string | null {
  if (password.length < 12) {
    return 'Le mot de passe doit contenir au moins 12 caractères.'
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length
  if (classes < 3) {
    return 'Le mot de passe doit combiner au moins 3 types de caractères parmi : minuscules, majuscules, chiffres, symboles.'
  }
  return null
}

// Templates préconfigurés proposés à l'étape "Config" du wizard de création de
// campagne (Phase 2). Statiques pour l'instant — pas besoin d'une table dédiée.
const CAMPAIGN_TEMPLATES = [
  {
    id: 'roulette-voyages',
    name: 'Roulette Voyages',
    gameMode: 'ROULETTE' as const,
    description: 'Séjours, vols et bons voyage à gagner à la roulette.',
    segments: [
      { name: 'Séjour Hôtel 3 nuits', color: '#FF6B47', winProbability: 0.05 },
      { name: 'Bon d\'achat 200 DH', color: '#182444', winProbability: 0.15 },
      { name: 'Réduction 10%', color: '#E8A33D', winProbability: 0.3 },
      { name: 'Perdu, réessayez', color: '#E2E8F0', winProbability: 0.5 },
    ],
  },
  {
    id: 'roulette-bons-achat',
    name: 'Bons d\'achat',
    gameMode: 'ROULETTE' as const,
    description: 'Segments de bons d\'achat de valeurs variées.',
    segments: [
      { name: 'Bon 500 DH', color: '#FF6B47', winProbability: 0.02 },
      { name: 'Bon 100 DH', color: '#C23F1F', winProbability: 0.13 },
      { name: 'Bon 50 DH', color: '#E8A33D', winProbability: 0.35 },
      { name: 'Perdu, réessayez', color: '#E2E8F0', winProbability: 0.5 },
    ],
  },
  {
    id: 'tirage-classique',
    name: 'Tirage classique',
    gameMode: 'DRAW' as const,
    description: 'Inscription puis tirage au sort à une date fixée.',
    prizes: [
      { name: 'Lot principal', totalStock: 1 },
      { name: 'Lot de consolation', totalStock: 5 },
    ],
  },
]

export const appRouter = router({
  // Admin Login Mutation
  loginAdmin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Fetch user from database
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Adresse email ou mot de passe incorrect.',
        })
      }

      // Check if user has admin/partner permissions
      if (user.role !== Role.SUPERADMIN && user.role !== Role.PARTNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas l'autorisation d'accéder à cette interface.",
        })
      }

      // Check password
      if (!user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Adresse email ou mot de passe incorrect.',
        })
      }

      const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash)
      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Adresse email ou mot de passe incorrect.',
        })
      }

      // Resolve partnerId for PARTNER role : lit User.partnerId en priorité.
      // Repli sur l'ancienne heuristique (domaine email) uniquement si ce
      // compte n'a pas encore été rattaché (ex: comptes créés avant la
      // migration partner_spaces, ou avant que le script de backfill n'ait
      // tourné en prod) — et auto-guérit en écrivant partnerId à ce moment,
      // pour ne plus jamais retomber sur l'heuristique aux logins suivants.
      let partnerId: string | null = null
      if (user.role === Role.PARTNER) {
        let partner = user.partnerId
          ? await prisma.partner.findUnique({ where: { id: user.partnerId } })
          : null

        if (!partner) {
          const domainPart = user.email.split('@')[1] || ''
          const domainPrefix = domainPart.split('.')[0]?.toLowerCase() || ''

          partner = await prisma.partner.findFirst({
            where: {
              OR: [
                { name: { contains: domainPrefix } },
                { allowedDomains: { contains: domainPart } }
              ]
            }
          })
          if (!partner) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: "Aucun partenaire correspondant trouvé dans la base de données.",
            })
          }
          await prisma.user.update({ where: { id: user.id }, data: { partnerId: partner.id } })
          // Trace pour audit a posteriori : cette résolution passe par
          // l'heuristique (domaine email), pas par un partnerId déjà fiable —
          // utile pour repérer d'éventuels rattachements incorrects après coup.
          await logActivity({
            userEmail: user.email,
            action: 'PARTNER_ID_RESOLVED_VIA_EMAIL_HEURISTIC',
            targetType: 'User',
            targetId: user.id,
            partnerId: partner.id,
          })
        }

        if (!partner.isActive) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Ce compte partenaire a été désactivé.",
          })
        }

        // Auto-inscription (formulaire public) : le partenaire ne peut pas se
        // connecter tant que le Super Admin ne l'a pas approuvé. Message
        // volontairement neutre et identique pour PENDING et REJECTED — ne
        // pas révéler si la demande a été activement rejetée ou juste pas
        // encore traitée.
        if (partner.status !== 'APPROVED') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Ce compte partenaire est en attente de validation.',
          })
        }

        partnerId = partner.id
      }

      // 2. Generate token
      const token = await createSessionToken({
        email: user.email,
        role: user.role,
        partnerId,
      })

      return {
        token,
        role: user.role,
        partnerId,
      }
    }),

  // Admin Logout Mutation
  logoutAdmin: publicProcedure.mutation(async () => {
    return { success: true }
  }),

  // Auto-inscription partenaire (formulaire public /partner/signup). Crée un
  // Partner en status PENDING + son compte User (role=PARTNER) en une
  // transaction — il ne peut pas se connecter tant qu'un Super Admin ne l'a
  // pas approuvé (voir loginAdmin). Anti-énumération : réponse générique
  // identique que l'email existe déjà ou non.
  registerPartner: publicProcedure
    .input(
      z.object({
        agencyName: z.string().trim().min(2, "Le nom de l'agence doit contenir au moins 2 caractères."),
        email: z.string().trim().email('Adresse email invalide.'),
        password: z.string(),
        phone: z.string().trim().min(1, 'Le téléphone est requis.'),
        contactName: z.string().trim().min(1, 'Le nom du contact est requis.'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const identifier = `partner-signup:${ctx.ip || 'unknown'}`
      let allowed: boolean
      try {
        const res = await authRatelimit.limit(identifier)
        allowed = res.success
      } catch (err) {
        console.error('[RateLimit ERROR] authRatelimit indisponible pour registerPartner — requête refusée par précaution (fail-closed):', err)
        allowed = false
      }
      if (!allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives. Réessayez dans une heure.' })
      }

      const strengthError = checkPasswordStrength(input.password)
      if (strengthError) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: strengthError })
      }

      const GENERIC_MESSAGE = "Votre demande a été enregistrée. Vous serez contacté(e) par email une fois votre compte validé."

      // Ne jamais révéler si cet email est déjà utilisé — même réponse dans
      // les deux cas, aucune création en cas de collision.
      const existingUser = await prisma.user.findUnique({ where: { email: input.email } })
      if (existingUser) {
        return { success: true, message: GENERIC_MESSAGE }
      }

      const slug = await generateUniquePartnerSlug(input.agencyName)
      const passwordHash = await bcrypt.hash(input.password, 10)

      const partner = await prisma.$transaction(async (tx) => {
        const partner = await tx.partner.create({
          data: {
            name: input.agencyName,
            slug,
            email: input.email,
            allowedDomains: '',
            status: 'PENDING',
          },
        })
        await tx.user.create({
          data: {
            email: input.email,
            name: input.contactName,
            phone: input.phone,
            role: Role.PARTNER,
            partnerId: partner.id,
            passwordHash,
          },
        })
        return partner
      })

      await logActivity({
        userEmail: input.email,
        action: 'PARTNER_SIGNUP_REQUESTED',
        targetType: 'Partner',
        targetId: partner.id,
        partnerId: partner.id,
      })

      return { success: true, message: GENERIC_MESSAGE }
    }),

  getCampaigns: publicProcedure
    .input(z.object({
      partnerId: z.string().optional(),
      partnerName: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      let partnerFilter: any = {}
      if (input?.partnerId) {
        partnerFilter = { partnerId: input.partnerId }
      } else if (input?.partnerName) {
        const partner = await prisma.partner.findFirst({
          where: {
            name: {
              equals: input.partnerName.toLowerCase().replace(/-/g, ' ')
            }
          }
        })
        if (partner) {
          partnerFilter = { partnerId: partner.id }
        } else {
          return []
        }
      }

      return prisma.campaign.findMany({
        where: {
          isActive: true,
          isDraft: false,
          ...partnerFilter
        },
        include: {
          partner: { select: { name: true } },
          // Must match the ordering spinRoulette uses to compute prizeIndex,
          // otherwise the wheel visually lands on a different prize than the one awarded.
          prizes: { orderBy: { winProbability: 'asc' } },
        },
        orderBy: { startDate: 'desc' },
      })
    }),

  // 2. Get single campaign with its prizes
  getCampaignDetails: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
        include: {
          partner: true,
          prizes: {
            orderBy: { winProbability: 'asc' }
          },
        },
      })

      if (!campaign || campaign.isDraft) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        })
      }

      // Merge remaining stocks from Redis for accurate real-time inventory
      const prizesWithRealTimeStock = await Promise.all(
        campaign.prizes.map(async (prize) => {
          if (prize.totalStock === -1) return prize // Unlimited fallback

          const cachedStock = await redis.hget<number>('prize:stocks', prize.id)
          return {
            ...prize,
            remainingStock: cachedStock !== null ? cachedStock : prize.remainingStock,
          }
        })
      )

      return {
        ...campaign,
        prizes: prizesWithRealTimeStock,
      }
    }),

  // Homepage hero video/poster (site-wide singleton config)
  getSiteSettings: publicProcedure.query(async () => {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } })
    const { defaultSenderEmailPassword, ...rest } = settings || {
      id: 'main',
      heroVideoData: null,
      heroVideoMimeType: null,
      heroPosterData: null,
      heroPosterMimeType: null,
      referralBonusSpins: 2,
      defaultSenderEmail: null,
      defaultSenderEmailPassword: null,
      // Défauts fidélité (Phase 1) — si aucune ligne SiteSettings n'existe encore.
      loyaltyEnabled: false,
      pointsPerTnd: 1,
      redeemPointsPerTnd: 100,
      minRedeemPoints: 500,
      voucherValidityDays: 90,
    }
    return { ...rest, hasDefaultSenderEmailPassword: !!defaultSenderEmailPassword }
  }),

  // Homepage promo banners (marquee strip)
  getPromoBanners: publicProcedure.query(async () => {
    return prisma.promoBanner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })
  }),

  // 3. Capture lead and award initial play tokens (+ referral credits)
  captureLead: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2, 'Name is required'),
        phone: z.string().optional(),
        campaignId: z.string(),
        partnerId: z.string(),
        source: z.enum(['WIDGET', 'QR_CODE', 'LINK']),
        referredByCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // ── Helper: normalize email for alias detection ──────────────────────────
      // Strips +tags from all emails, and removes dots from the local part for
      // Gmail/Googlemail domains only (dots are ignored by Gmail routing).
      const normalizeEmail = (raw: string): string => {
        const lower = raw.toLowerCase().trim()
        const atIdx = lower.lastIndexOf('@')
        if (atIdx === -1) return lower
        let local = lower.slice(0, atIdx)
        const domain = lower.slice(atIdx + 1)

        // Strip "+tag" suffix from local part (works for all providers)
        const plusIdx = local.indexOf('+')
        if (plusIdx !== -1) local = local.slice(0, plusIdx)

        // Remove dots from local part for Gmail / Googlemail only
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
          local = local.replace(/\./g, '')
        }

        return `${local}@${domain}`
      }

      const newUserNormalizedEmail = normalizeEmail(input.email)

      // Find or create player
      let user = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: input.email,
            name: input.name,
            phone: input.phone,
            role: 'PLAYER',
            normalizedEmail: newUserNormalizedEmail,
          },
        })
      } else if (!user.normalizedEmail) {
        // Backfill normalizedEmail for pre-existing users on first lead capture
        user = await prisma.user.update({
          where: { id: user.id },
          data: { normalizedEmail: newUserNormalizedEmail },
        })
      }

      // Check if lead capture already exists for this campaign (prevent duplicate entries)
      const existingLead = await prisma.leadCapture.findUnique({
        where: {
          userId_campaignId: {
            userId: user.id,
            campaignId: input.campaignId,
          },
        },
      })

      if (existingLead) {
        // Retrieve remaining unused tokens
        const tokens = await prisma.playToken.count({
          where: {
            userId: user.id,
            campaignId: input.campaignId,
            status: TokenStatus.UNUSED,
          },
        })

        return {
          user,
          tokensCount: tokens,
          message: 'Welcome back! You have already registered for this campaign.',
        }
      }

      // Record lead capture
      await prisma.leadCapture.create({
        data: {
          userId: user.id,
          partnerId: input.partnerId,
          campaignId: input.campaignId,
          source: input.source,
        },
      })

      // Handle referral credits if referredByCode is supplied and valid
      if (input.referredByCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: input.referredByCode },
        })

        // Referrer must exist and not be the user themselves (same DB id)
        if (referrer && referrer.id !== user.id) {
          // ── Anti-fraud check 1: normalized email comparison ────────────────
          // Detect alias abuse (email+1@gmail.com, j.ean@gmail.com, etc.)
          const referrerNormalized = referrer.normalizedEmail ?? normalizeEmail(referrer.email)
          const newUserNormalized  = user.normalizedEmail  ?? newUserNormalizedEmail

          if (referrerNormalized === newUserNormalized) {
            console.warn(
              `[REFERRAL_FRAUD] Normalized email collision — self-referral detected. ` +
              `referrer: ${referrer.email} (normalized: ${referrerNormalized}), ` +
              `new user: ${user.email} (normalized: ${newUserNormalized}). ` +
              `Referral tokens NOT awarded.`
            )
            // Fall through: new user still gets 3 signup tokens below; referrer gets nothing
          } else {
            // ── Anti-fraud check 2: per-campaign referral cap (max 20) ────────
            const REFERRAL_CAP = 20

            // Count users referred by this referrer who also have a lead on this campaign
            const rewardedReferralCount = await prisma.user.count({
              where: {
                referredById: referrer.id,
                leads: {
                  some: { campaignId: input.campaignId },
                },
              },
            })

            if (rewardedReferralCount >= REFERRAL_CAP) {
              console.warn(
                `[REFERRAL_CAP] Referrer ${referrer.email} (id: ${referrer.id}) has reached ` +
                `the ${REFERRAL_CAP}-referral limit on campaign ${input.campaignId}. ` +
                `Referral bonus NOT awarded.`
              )
              // Fall through: new user gets 3 signup tokens; referrer gets nothing
            } else {
              // All checks passed — update player's referredById and award bonus spins
              await prisma.user.update({
                where: { id: user.id },
                data: { referredById: referrer.id },
              })

              // Nombre de lancers bonus configurable depuis Réglages (défaut : 2)
              const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'main' } })
              const referralBonusSpins = siteSettings?.referralBonusSpins ?? 2
              if (referralBonusSpins > 0) {
                await prisma.playToken.createMany({
                  data: Array.from({ length: referralBonusSpins }).map(() => ({
                    userId: referrer.id,
                    campaignId: input.campaignId,
                    earnedVia: EarnMethod.REFERRAL,
                    status: TokenStatus.UNUSED,
                  })),
                })
              }

              console.log(`Referral successfully rewarded for user code ${input.referredByCode}`)
            }
          }
        }
      }

      // Lancers offerts immédiatement à l'inscription — plus besoin de ticket de
      // caisse. Le nombre de lancers est configurable par campagne (spinsPerClient,
      // réglable depuis "Configurer" dans le back-office).
      const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId } })
      if (campaign && campaign.gameMode === 'ROULETTE') {
        await prisma.playToken.createMany({
          data: Array.from({ length: campaign.spinsPerClient }).map(() => ({
            userId: user!.id,
            campaignId: input.campaignId,
            earnedVia: EarnMethod.SIGNUP,
            status: TokenStatus.UNUSED,
          })),
        })
      }

      const startingTokens = await prisma.playToken.count({
        where: { userId: user!.id, campaignId: input.campaignId, status: TokenStatus.UNUSED },
      })

      return {
        user,
        tokensCount: startingTokens,
        message: 'Inscription réussie ! Vous pouvez jouer dès maintenant.',
      }
    }),


  // 4. Concurrency-Safe Spin Roulette Procedure
  spinRoulette: rateLimitedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // a. Rate limit check: Prevent clicking multiple times within 2 seconds
      const lockKey = `spin_lock:${input.email}`
      let isLocked = false
      try {
        const lockVal = await redis.get<string>(lockKey)
        if (lockVal) {
          isLocked = true
        }
      } catch (err) {
        console.warn('[Redis Warning] Failed to read rate-limit lock from Redis, ignoring lock:', err)
      }

      if (isLocked) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Please wait a moment between spins.',
        })
      }

      try {
        await redis.set(lockKey, 'locked', { ex: 2 })
      } catch (err) {
        console.warn('[Redis Warning] Failed to write rate-limit lock to Redis:', err)
      }

      // b. Verify player exists
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found. Please submit your information first.',
        })
      }

      // c. Check if user has an unused, non-expired spin token for this campaign
      const tokenValidityThreshold = new Date()
      tokenValidityThreshold.setDate(tokenValidityThreshold.getDate() - TOKEN_VALIDITY_DAYS)

      const unusedToken = await prisma.playToken.findFirst({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: TokenStatus.UNUSED,
          createdAt: { gte: tokenValidityThreshold },
        },
      })

      if (!unusedToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No spin credits remaining! Share your referral link to get more.',
        })
      }

      // d. Fetch all prizes configured for this campaign that are not scheduled drawings (drawDate: null)
      const prizes = await prisma.prize.findMany({
        where: { campaignId: input.campaignId, drawDate: null },
        orderBy: { winProbability: 'asc' }, // Order consistently to build cumulative wheel ranges
      })

      if (prizes.length === 0) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No prizes configured for this campaign.',
        })
      }

      // e. Secure RNG drawing via crypto.getRandomValues
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      const randomValue = array[0] / 4294967295 // Normalize to float between 0 and 1

      // Find selected prize segment (defaulting to consolation prize fallback)
      let selectedPrize: Prize = prizes.find((p) => p.totalStock === -1) || prizes[prizes.length - 1]
      let cumulativeProbability = 0
      for (const prize of prizes) {
        cumulativeProbability += prize.winProbability
        if (randomValue <= cumulativeProbability) {
          selectedPrize = prize
          break
        }
      }

      const consolationPrize = prizes.find((p) => p.totalStock === -1) || prizes[prizes.length - 1]

      // f. Atomic Stock Depletion using Upstash Redis hincrby
      if (selectedPrize.totalStock !== -1) {
        try {
          // Sync remaining stock from DB to Redis if not initialized
          let cachedStock = await redis.hget<number>('prize:stocks', selectedPrize.id)
          if (cachedStock === null) {
            await redis.hset('prize:stocks', { [selectedPrize.id]: selectedPrize.remainingStock })
            cachedStock = selectedPrize.remainingStock
          }

          // Atomically decrement
          const newStock = await redis.hincrby('prize:stocks', selectedPrize.id, -1)

          // If depleted, allocate fallback prize instead
          if (newStock < 0) {
            // Revert the decrement
            await redis.hincrby('prize:stocks', selectedPrize.id, 1)

            // Redirect to fallback consolation prize
            if (selectedPrize.fallbackPrizeId) {
              selectedPrize = prizes.find((p) => p.id === selectedPrize.fallbackPrizeId) || consolationPrize
            } else {
              selectedPrize = consolationPrize
            }
          }
        } catch (redisErr) {
          console.warn('[Redis Warning] Failed atomic stock depletion in Redis. Falling back to DB stock check.', redisErr)
          // Fallback logic: check DB stock directly
          if (selectedPrize.remainingStock <= 0) {
            if (selectedPrize.fallbackPrizeId) {
              selectedPrize = prizes.find((p) => p.id === selectedPrize.fallbackPrizeId) || consolationPrize
            } else {
              selectedPrize = consolationPrize
            }
          }
        }
      }

      // g. Record winning and consume token inside atomic SQL transaction
      let createdUserPrize: { id: string }
      try {
        const [, userPrizeResult] = await prisma.$transaction([
          // Mark play token as USED
          prisma.playToken.update({
            where: { id: unusedToken.id },
            data: { status: TokenStatus.USED },
          }),
          // Record won prize
          prisma.userPrize.create({
            data: {
              userId: user.id,
              prizeId: selectedPrize.id,
              status: 'PENDING',
            },
          }),
          // If prize has limited stock, decrement remaining stock in database
          ...(selectedPrize.totalStock !== -1
            ? [
              prisma.prize.update({
                where: { id: selectedPrize.id },
                data: { remainingStock: { decrement: 1 } },
              }),
            ]
            : []),
        ])
        createdUserPrize = userPrizeResult as { id: string }
      } catch (err) {
        console.error('SQL transaction failed, attempting compensation:', err)
        // Compensation logic: Revert Redis stock lock if SQL database write failed
        if (selectedPrize.totalStock !== -1) {
          try {
            await redis.hincrby('prize:stocks', selectedPrize.id, 1)
          } catch (redisErr) {
            console.warn('[Redis Warning] Failed to revert stock in Redis:', redisErr)
          }
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database write failed. Your spin has been refunded.',
        })
      }

      // h. Notify the winner by email, sent from the partner/agency's own address.
      // Never allowed to break the spin flow — failures are only logged.
      try {
        const campaign = await prisma.campaign.findUnique({
          where: { id: input.campaignId },
          include: { partner: true },
        })
        const senderCreds = campaign ? await resolveSenderCredentials(campaign) : null
        if (campaign && senderCreds) {
          const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
          await sendWinnerEmail({
            to: user.email,
            winnerName: user.name,
            prizeName: selectedPrize.name,
            partnerName: campaign.partner?.name || campaign.title,
            senderEmail: senderCreds.senderEmail,
            senderEmailPassword: senderCreds.senderEmailPassword,
            confirmationCode: createdUserPrize.id.slice(-8).toUpperCase(),
            voucherUrl: `${baseUrl}/voucher/${createdUserPrize.id}`,
          })
        }
      } catch (mailErr) {
        console.warn('[Email Warning] Failed to send winner notification email:', mailErr)
      }

      // Get count of remaining valid (non-expired) spins
      const remainingSpins = await prisma.playToken.count({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: TokenStatus.UNUSED,
          createdAt: { gte: tokenValidityThreshold },
        },
      })

      // Find index in prize list to tell the wheel where to stop
      const prizeIndex = prizes.findIndex((p) => p.id === selectedPrize!.id)

      return {
        prize: selectedPrize,
        prizeIndex,
        remainingSpins,
        randomValue, // Useful debug/rotation reference
      }
    }),

  // 5. Get statistics for a Partner B2B Dashboard
  getPartnerStats: adminProcedure
    .input(z.object({ partnerId: z.string() }))
    .query(async ({ input, ctx }) => {
      let targetPartnerId = input.partnerId
      if (ctx.userSession!.role === Role.PARTNER) {
        if (!ctx.userSession!.partnerId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Aucun partenaire associé à votre compte.",
          })
        }
        targetPartnerId = ctx.userSession!.partnerId
      }

      const partner = await prisma.partner.findUnique({
        where: { id: targetPartnerId },
        include: {
          campaigns: {
            include: {
              prizes: true,
              leads: {
                include: {
                  user: {
                    include: {
                      wonPrizes: {
                        include: { prize: true }
                      }
                    }
                  }
                }
              },
            },
          },
        },
      })

      if (!partner) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Partner not found',
        })
      }

      // Format clean statistics out of database lists
      const campaignStats = await Promise.all(
        partner.campaigns.map(async (camp) => {
          const totalLeads = camp.leads.length
          const totalSpinsUsed = await prisma.playToken.count({
            where: { campaignId: camp.id, status: TokenStatus.USED },
          })
          const totalSpinsUnused = await prisma.playToken.count({
            where: { campaignId: camp.id, status: TokenStatus.UNUSED },
          })

          const leadsFormatted = camp.leads.map((lead) => ({
            id: lead.id,
            name: lead.user.name,
            email: lead.user.email,
            phone: lead.user.phone,
            source: lead.source,
            createdAt: lead.createdAt,
            prizesWon: lead.user.wonPrizes
              .filter((wp) => wp.prize.campaignId === camp.id)
              .map((wp) => wp.prize.name),
          }))

          return {
            id: camp.id,
            title: camp.title,
            isActive: camp.isActive,
            totalLeads,
            totalSpinsUsed,
            totalSpinsUnused,
            leads: leadsFormatted,
            prizes: camp.prizes,
          }
        })
      )

      return {
        id: partner.id,
        name: partner.name,
        allowedDomains: partner.allowedDomains,
        campaigns: campaignStats,
      }
    }),

  // Tableau de bord admin : KPIs, tendances 30 jours, section "À traiter".
  // PARTNER ne voit que ses propres campagnes (filtre serveur), SUPERADMIN voit tout.
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    const session = ctx.userSession!
    let partnerId: string | null = null
    if (session.role !== Role.SUPERADMIN) {
      if (!session.partnerId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Aucun partenaire associé à votre compte.',
        })
      }
      partnerId = session.partnerId
    }

    const campaigns = await prisma.campaign.findMany({
      where: partnerId ? { partnerId } : {},
      include: { prizes: true },
    })
    const campaignIds = campaigns.map((c) => c.id)

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalLeads,
      spinsToday,
      gagnantsAContacter,
      totalSpinsUsed,
      leadsLast30,
      userPrizesForBreakdown,
      pendingWinnersRaw,
    ] = await Promise.all([
      prisma.leadCapture.count({ where: { campaignId: { in: campaignIds } } }),
      prisma.userPrize.count({
        where: { claimedAt: { gte: startOfToday }, prize: { campaignId: { in: campaignIds } } },
      }),
      prisma.userPrize.count({
        where: { status: 'PENDING', prize: { campaignId: { in: campaignIds } } },
      }),
      prisma.playToken.count({ where: { campaignId: { in: campaignIds }, status: TokenStatus.USED } }),
      prisma.leadCapture.findMany({
        where: { campaignId: { in: campaignIds }, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.userPrize.findMany({
        where: { prize: { campaignId: { in: campaignIds } } },
        select: { claimedAt: true, prize: { select: { campaignId: true, type: true, totalStock: true } } },
      }),
      prisma.userPrize.findMany({
        where: { status: { in: ['PENDING', 'CONTACTED'] }, prize: { campaignId: { in: campaignIds } } },
        include: { user: true, prize: { include: { campaign: true } } },
        orderBy: { claimedAt: 'desc' },
        take: 8,
      }),
    ])

    const conversionRate = totalLeads > 0 ? Math.round((totalSpinsUsed / totalLeads) * 100) : 0
    const lotsRestants = campaigns.reduce(
      (sum, c) => sum + c.prizes.reduce((s, p) => s + (p.totalStock === -1 ? 0 : p.remainingStock), 0),
      0
    )

    // Tendance leads sur 30 jours (une entrée par jour, même à 0)
    const trendMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      trendMap.set(d.toISOString().slice(0, 10), 0)
    }
    leadsLast30.forEach((l) => {
      const key = l.createdAt.toISOString().slice(0, 10)
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + 1)
    })
    const leadsTrend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }))

    // Comparaison 7 derniers jours vs 7 jours précédents — seules les métriques
    // qui ont un vrai sens en évolution hebdomadaire (pas de snapshot historique
    // pour les stocks/campagnes actives, donc pas de tendance affichée dessus).
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const pctChange = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0

    const leadsThisWeek = leadsLast30.filter((l) => l.createdAt >= oneWeekAgo).length
    const leadsPrevWeek = leadsLast30.filter((l) => l.createdAt >= twoWeeksAgo && l.createdAt < oneWeekAgo).length

    const spinsThisWeek = userPrizesForBreakdown.filter((up) => up.claimedAt >= oneWeekAgo).length
    const spinsPrevWeek = userPrizesForBreakdown.filter(
      (up) => up.claimedAt >= twoWeeksAgo && up.claimedAt < oneWeekAgo
    ).length

    const conversionThisWeek = leadsThisWeek > 0 ? Math.round((spinsThisWeek / leadsThisWeek) * 100) : 0
    const conversionPrevWeek = leadsPrevWeek > 0 ? Math.round((spinsPrevWeek / leadsPrevWeek) * 100) : 0

    // Tours joués par campagne (top 8)
    const spinsByCampaign = new Map<string, number>()
    userPrizesForBreakdown.forEach((up) => {
      const cId = up.prize.campaignId
      spinsByCampaign.set(cId, (spinsByCampaign.get(cId) || 0) + 1)
    })
    const spinsPerCampaign = campaigns
      .map((c) => ({ title: c.title, count: spinsByCampaign.get(c.id) || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Répartition des lots gagnés (physique / numérique / consolation)
    let physical = 0
    let digital = 0
    let consolation = 0
    userPrizesForBreakdown.forEach((up) => {
      if (up.prize.totalStock === -1) consolation++
      else if (up.prize.type === 'PHYSICAL') physical++
      else digital++
    })

    return {
      kpis: {
        totalLeads,
        activeCampaigns: campaigns.filter((c) => c.isActive).length,
        spinsToday,
        lotsRestants,
        conversionRate,
        gagnantsAContacter,
      },
      trends: {
        totalLeads: pctChange(leadsThisWeek, leadsPrevWeek),
        spinsToday: pctChange(spinsThisWeek, spinsPrevWeek),
        conversionRate: pctChange(conversionThisWeek, conversionPrevWeek),
      },
      leadsTrend,
      spinsPerCampaign,
      prizeBreakdown: [
        { name: 'Physique', value: physical },
        { name: 'Numérique', value: digital },
        { name: 'Consolation', value: consolation },
      ],
      pendingWinners: pendingWinnersRaw.map((w) => ({
        id: w.id,
        userName: w.user.name,
        userEmail: w.user.email,
        prizeName: w.prize.name,
        campaignTitle: w.prize.campaign.title,
        claimedAt: w.claimedAt,
        status: w.status,
      })),
      endingSoonCampaigns: campaigns
        .filter((c) => c.isActive && c.endDate >= now && c.endDate <= in7Days)
        .map((c) => ({ id: c.id, title: c.title, endDate: c.endDate })),
    }
  }),

  // Helper: Get user's referral code and claim logs
  getPlayerInfo: publicProcedure
    .input(z.object({ email: z.string().email(), campaignId: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: {
          wonPrizes: {
            include: { prize: true },
          },
        },
      })

      if (!user) {
        return { tokens: 0, referralCode: '', prizesWon: [], completedTasks: [], hasPendingReceipt: false }
      }

      const tokens = await prisma.playToken.count({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: TokenStatus.UNUSED,
        },
      })

      const campaignPrizes = user.wonPrizes
        .filter((wp) => wp.prize.campaignId === input.campaignId)
        .map((wp) => ({
          prizeName: wp.prize.name,
          claimedAt: wp.claimedAt,
          status: wp.status,
        }))

      // Get completed tasks for challenges
      const completedTokens = await prisma.playToken.findMany({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          earnedVia: {
            in: [EarnMethod.VISIT_WEBSITE, EarnMethod.FOLLOW_SOCIAL, EarnMethod.RECEIPT_UPLOAD, EarnMethod.JOIN_DRAW],
          },
        },
        select: {
          earnedVia: true,
        },
      })
      const completedTasks = Array.from(new Set(completedTokens.map((t) => t.earnedVia)))

      // Check if there's a pending receipt submission
      const pendingReceipt = await prisma.receiptSubmission.findFirst({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: 'PENDING',
        },
      })

      return {
        tokens,
        referralCode: user.referralCode,
        prizesWon: campaignPrizes,
        completedTasks,
        hasPendingReceipt: !!pendingReceipt,
      }
    }),

  // Submit a receipt for verification
  submitReceipt: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        campaignId: z.string(),
        fileData: z.string(),
        fileMimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found. Please register first.',
        })
      }

      // Check if they already have an APPROVED receipt or completed token
      const existingToken = await prisma.playToken.findFirst({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          earnedVia: EarnMethod.RECEIPT_UPLOAD,
        },
      })

      if (existingToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vous avez déjà validé ce défi !',
        })
      }

      // Check if they already have a PENDING submission
      const existingPending = await prisma.receiptSubmission.findFirst({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: 'PENDING',
        },
      })

      if (existingPending) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Un ticket est déjà en cours de vérification.',
        })
      }

      // Create ReceiptSubmission
      const submission = await prisma.receiptSubmission.create({
        data: {
          userId: user.id,
          campaignId: input.campaignId,
          fileData: input.fileData,
          fileMimeType: input.fileMimeType,
          status: 'PENDING',
        },
      })

      return {
        success: true,
        submissionId: submission.id,
        message: 'Ticket envoyé ! Il sera vérifié sous peu.',
      }
    }),

  getUserPrizesByEmail: publicProcedure
    .input(z.object({ 
      email: z.string().email(),
      signature: z.string()
    }))
    .query(async ({ input }) => {
      const secret = process.env.SHARED_API_SECRET || "obooking-travel-secure-shared-api-secret-key-2026-xyz!";
      const expectedSignature = crypto.createHmac('sha256', secret).update(input.email).digest('hex');
      
      if (input.signature !== expectedSignature) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid signature. Request verification failed.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: {
          wonPrizes: {
            include: {
              prize: {
                include: {
                  campaign: {
                    include: {
                      partner: { select: { name: true } }
                    }
                  }
                }
              }
            },
            orderBy: { claimedAt: 'desc' },
          }
        }
      })

      if (!user) {
        return []
      }

      const now = new Date()
      return user.wonPrizes.map((wp) => {
        // Calculate prize expiry from claimedAt + validityDays — never delete, only flag
        let isExpired = false
        if (wp.prize.validityDays) {
          const expiresAt = new Date(wp.claimedAt)
          expiresAt.setDate(expiresAt.getDate() + wp.prize.validityDays)
          isExpired = now > expiresAt
        }
        return {
          id: wp.id,
          prizeName: wp.prize.name,
          prizeType: wp.prize.type,
          campaignTitle: wp.prize.campaign.title,
          partnerName: wp.prize.campaign.partner?.name || 'Obooking',
          claimedAt: wp.claimedAt,
          status: wp.status,
          promoCode: wp.prize.campaign.promoCode,
          promoTitle: wp.prize.campaign.promoTitle,
          promoDesc: wp.prize.campaign.promoDesc,
          validityDays: wp.prize.validityDays,
          isExpired,
        }
      })
    }),

  claimTaskToken: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        campaignId: z.string(),
        taskType: z.enum(['VISIT_WEBSITE', 'FOLLOW_SOCIAL', 'JOIN_DRAW']),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found. Please register first.',
        })
      }

      // Check if task already completed for this campaign
      const existingToken = await prisma.playToken.findFirst({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          earnedVia: input.taskType as EarnMethod,
        },
      })

      if (existingToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vous avez déjà validé ce défi !',
        })
      }

      // Determine if it is a Tirage task that should not award roulette spins
      const isTirageTask = input.taskType === 'JOIN_DRAW'

      if (isTirageTask) {
        // Create a single used token to record completion without awarding any roulette spins
        await prisma.playToken.create({
          data: {
            userId: user.id,
            campaignId: input.campaignId,
            earnedVia: input.taskType as EarnMethod,
            status: TokenStatus.USED,
          },
        })

        // Confirm the draw entry by email, sent from the partner/agency's own
        // address. Never allowed to break the registration flow — failures are only logged.
        try {
          const campaign = await prisma.campaign.findUnique({
            where: { id: input.campaignId },
            include: {
              partner: true,
              prizes: { where: { drawDate: { not: null } }, orderBy: { drawDate: 'asc' }, take: 1 },
            },
          })
          const senderCreds = campaign ? await resolveSenderCredentials(campaign) : null
          if (campaign && senderCreds) {
            await sendDrawRegistrationEmail({
              to: user.email,
              participantName: user.name,
              campaignTitle: campaign.title,
              partnerName: campaign.partner?.name || campaign.title,
              senderEmail: senderCreds.senderEmail,
              senderEmailPassword: senderCreds.senderEmailPassword,
              drawDate: campaign.prizes[0]?.drawDate ?? null,
            })
          }
        } catch (mailErr) {
          console.warn('[Email Warning] Failed to send draw registration confirmation email:', mailErr)
        }
      } else {
        // Roulette tasks award unused tokens (spins)
        const tokensCount = 1
        await prisma.playToken.createMany({
          data: Array.from({ length: tokensCount }).map(() => ({
            userId: user.id,
            campaignId: input.campaignId,
            earnedVia: input.taskType as EarnMethod,
            status: TokenStatus.UNUSED,
          })),
        })
      }

      // Get updated total unused, non-expired spins count
      const claimTokenValidityThreshold = new Date()
      claimTokenValidityThreshold.setDate(claimTokenValidityThreshold.getDate() - TOKEN_VALIDITY_DAYS)
      const totalUnusedSpins = await prisma.playToken.count({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: TokenStatus.UNUSED,
          createdAt: { gte: claimTokenValidityThreshold },
        },
      })

      return {
        success: true,
        tokensAwarded: isTirageTask ? 0 : 1,
        totalTokens: totalUnusedSpins,
        message: isTirageTask
          ? 'Défi validé avec succès pour le tirage au sort !'
          : 'Félicitations ! Vous avez obtenu +1 lancer.',
      }
    }),

  // Admin procedures for receipt submissions moderation
  getReceiptSubmissions: adminProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { role, partnerId } = ctx.userSession!
      const whereClause: any = {}

      if (input.status) {
        whereClause.status = input.status
      }

      if (role === Role.PARTNER) {
        if (!partnerId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Aucun partenaire associé à votre compte.',
          })
        }
        whereClause.campaign = {
          partnerId: partnerId,
        }
      }

      return prisma.receiptSubmission.findMany({
        where: whereClause,
        include: {
          user: true,
          campaign: true,
        },
        orderBy: {
          submittedAt: 'desc',
        },
      })
    }),

  reviewReceiptSubmission: adminProcedure
    .input(
      z.object({
        submissionId: z.string(),
        decision: z.enum(['APPROVED', 'REJECTED']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const submission = await prisma.receiptSubmission.findUnique({
        where: { id: input.submissionId },
        include: {
          campaign: true,
        },
      })

      if (!submission) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Soumission non trouvée.',
        })
      }

      // Vérifie l'appartenance avant tout check métier, pour ne pas laisser
      // fuiter d'informations (ex: statut déjà traité) sur une soumission
      // d'un autre partenaire via les messages d'erreur.
      if (ctx.userSession!.role !== Role.SUPERADMIN && submission.campaign.partnerId !== ctx.userSession!.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Cette soumission n'appartient pas à votre partenaire." })
      }

      if (submission.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cette soumission a déjà été traitée.',
        })
      }

      const email = ctx.userSession!.email

      if (input.decision === 'APPROVED') {
        // SQL Transaction to mark as APPROVED and grant real, usable roulette spins.
        // This is the only way a player earns roulette spins — no more free signup tokens.
        await prisma.$transaction([
          prisma.receiptSubmission.update({
            where: { id: input.submissionId },
            data: {
              status: 'APPROVED',
              reviewedAt: new Date(),
              reviewedByEmail: email,
            },
          }),
          prisma.playToken.createMany({
            data: Array.from({ length: 3 }).map(() => ({
              userId: submission.userId,
              campaignId: submission.campaignId,
              earnedVia: EarnMethod.RECEIPT_UPLOAD,
              status: TokenStatus.UNUSED,
            })),
          }),
        ])
      } else {
        // Just mark as REJECTED
        await prisma.receiptSubmission.update({
          where: { id: input.submissionId },
          data: {
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewedByEmail: email,
          },
        })
      }

      return { success: true }
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Gagnants (UserPrize) — suivi PENDING → CONTACTED → DELIVERED / RETRIEVED
  // ─────────────────────────────────────────────────────────────────────────

  getAllWinners: adminProcedure.query(async ({ ctx }) => {
    const session = ctx.userSession!
    let partnerId: string | null = null
    if (session.role !== Role.SUPERADMIN) {
      if (!session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Aucun partenaire associé à votre compte.' })
      }
      partnerId = session.partnerId
    }

    const winners = await prisma.userPrize.findMany({
      where: partnerId ? { prize: { campaign: { partnerId } } } : {},
      include: { user: true, prize: { include: { campaign: true } } },
      orderBy: { claimedAt: 'desc' },
    })

    return winners.map((w) => ({
      id: w.id,
      userName: w.user.name,
      userEmail: w.user.email,
      userPhone: w.user.phone,
      prizeName: w.prize.name,
      prizeType: w.prize.type,
      campaignId: w.prize.campaignId,
      campaignTitle: w.prize.campaign.title,
      claimedAt: w.claimedAt,
      status: w.status,
      canResendEmail: !!(w.prize.campaign.senderEmail && w.prize.campaign.senderEmailPassword),
    }))
  }),

  updateWinnerStatus: writeProcedure
    .input(z.object({ id: z.string(), status: z.enum(['PENDING', 'CONTACTED', 'DELIVERED', 'RETRIEVED']) }))
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const userPrize = await prisma.userPrize.findUnique({
        where: { id: input.id },
        include: { prize: { include: { campaign: true } } },
      })
      if (!userPrize) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gagnant introuvable.' })
      if (session.role !== Role.SUPERADMIN && userPrize.prize.campaign.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Ce gagnant n'appartient pas à votre partenaire." })
      }
      const updated = await prisma.userPrize.update({ where: { id: input.id }, data: { status: input.status } })
      await logActivity({
        userEmail: session.email,
        action: `WINNER_STATUS_${input.status}`,
        targetType: 'UserPrize',
        targetId: input.id,
      })
      return updated
    }),

  resendWinnerEmail: writeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const userPrize = await prisma.userPrize.findUnique({
        where: { id: input.id },
        include: { user: true, prize: { include: { campaign: { include: { partner: true } } } } },
      })
      if (!userPrize) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gagnant introuvable.' })
      if (session.role !== Role.SUPERADMIN && userPrize.prize.campaign.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Ce gagnant n'appartient pas à votre partenaire." })
      }
      const senderCreds = await resolveSenderCredentials(userPrize.prize.campaign)
      if (!senderCreds) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Aucune adresse d'envoi configurée (ni sur la campagne, ni par défaut dans Réglages).",
        })
      }
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
      await sendWinnerEmail({
        to: userPrize.user.email,
        winnerName: userPrize.user.name,
        prizeName: userPrize.prize.name,
        partnerName: userPrize.prize.campaign.partner?.name || userPrize.prize.campaign.title,
        senderEmail: senderCreds.senderEmail,
        senderEmailPassword: senderCreds.senderEmailPassword,
        confirmationCode: userPrize.id.slice(-8).toUpperCase(),
        voucherUrl: `${baseUrl}/voucher/${userPrize.id}`,
      })
      return { success: true }
    }),

  // Expire stale play tokens in bulk (triggered manually from the admin dashboard)
  expireStaleTokens: adminProcedure.mutation(async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - TOKEN_VALIDITY_DAYS)
    const result = await prisma.playToken.updateMany({
      where: {
        status: TokenStatus.UNUSED,
        createdAt: { lt: cutoff },
      },
      data: { status: TokenStatus.EXPIRED },
    })
    return { expiredCount: result.count }
  }),

  // Partners CRUD
  getPartners: superAdminProcedure.query(async () => {
    // Les demandes PENDING/REJECTED vivent dans la file de validation
    // (getPendingPartners) — cette liste ne montre que les partenaires actifs
    // dans le système (créés par le Super Admin ou déjà approuvés).
    const partners = await prisma.partner.findMany({
      where: { status: 'APPROVED' },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { campaigns: true, users: true } },
      },
    })
    return partners.map((p) => ({
      ...p,
      campaignCount: p._count.campaigns,
      accountCount: p._count.users,
    }))
  }),

  // Crée le Partner et son compte de connexion (User role=PARTNER) en une seule
  // transaction — un partenaire sans compte lié ne pourrait jamais se
  // connecter à son propre espace. Le super admin choisit lui-même le mot de
  // passe initial (saisi dans le formulaire, éventuellement via le bouton
  // "Générer") — jamais stocké en clair, jamais loggé, seul le hash bcrypt
  // est conservé.
  createPartner: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
        slug: z.string().min(2, 'Le slug doit contenir au moins 2 caractères.')
          .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.'),
        email: z.string().trim().email('Adresse email invalide.'),
        password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
        allowedDomains: z.string().default(''),
        logoUrl: z.string().nullable().optional(),
        primaryColor: z.string().nullable().optional(),
        secondaryColor: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingSlug = await prisma.partner.findUnique({ where: { slug: input.slug } })
      if (existingSlug) {
        throw new TRPCError({ code: 'CONFLICT', message: `Le slug "${input.slug}" est déjà utilisé par un autre partenaire.` })
      }
      const existingUser = await prisma.user.findUnique({ where: { email: input.email } })
      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: `L'adresse ${input.email} est déjà utilisée par un compte existant.` })
      }

      const passwordHash = await bcrypt.hash(input.password, 10)

      const { partner, user } = await prisma.$transaction(async (tx) => {
        const partner = await tx.partner.create({
          data: {
            name: input.name,
            slug: input.slug,
            email: input.email,
            allowedDomains: input.allowedDomains,
            logoUrl: input.logoUrl || null,
            primaryColor: input.primaryColor || null,
            secondaryColor: input.secondaryColor || null,
            // Créé directement par le Super Admin : pas de file de validation
            // à passer, contrairement à l'auto-inscription publique.
            status: 'APPROVED',
            reviewedAt: new Date(),
          },
        })
        const user = await tx.user.create({
          data: {
            email: input.email,
            role: Role.PARTNER,
            partnerId: partner.id,
            passwordHash,
          },
        })
        return { partner, user }
      })

      await logActivity({
        userEmail: ctx.userSession!.email,
        action: 'PARTNER_CREATED',
        targetType: 'Partner',
        targetId: partner.id,
        partnerId: partner.id,
      })

      return { partner, accountEmail: user.email }
    }),

  updatePartner: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        allowedDomains: z.string().default(''),
        email: z.string().trim().email('Adresse email invalide.').nullable().optional(),
        logoUrl: z.string().nullable().optional(),
        primaryColor: z.string().nullable().optional(),
        secondaryColor: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.partner.update({
        where: { id: input.id },
        data: {
          name: input.name,
          allowedDomains: input.allowedDomains,
          email: input.email ?? undefined,
          logoUrl: input.logoUrl ?? undefined,
          primaryColor: input.primaryColor ?? undefined,
          secondaryColor: input.secondaryColor ?? undefined,
        },
      })
    }),

  // Active/désactive un partenaire — un partenaire désactivé ne peut plus se
  // connecter (vérifié dans loginAdmin). N'affecte pas ses données existantes.
  togglePartnerActive: superAdminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const partner = await prisma.partner.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
      await logActivity({
        userEmail: ctx.userSession!.email,
        action: input.isActive ? 'PARTNER_ACTIVATED' : 'PARTNER_DEACTIVATED',
        targetType: 'Partner',
        targetId: partner.id,
        partnerId: partner.id,
      })
      return partner
    }),

  // Régénère le mot de passe du compte de connexion d'un partenaire — utile
  // si le partenaire l'a perdu ou en cas de doute sur une fuite. Retourné en
  // clair une seule fois dans la réponse ; jamais stocké ni loggé.
  resetPartnerAccountPassword: superAdminProcedure
    .input(z.object({ partnerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const account = await prisma.user.findFirst({
        where: { partnerId: input.partnerId, role: Role.PARTNER },
      })
      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Aucun compte partenaire trouvé pour ce partenaire.' })
      }

      const temporaryPassword = generateSecurePassword()
      const passwordHash = await bcrypt.hash(temporaryPassword, 10)
      await prisma.user.update({ where: { id: account.id }, data: { passwordHash } })

      await logActivity({
        userEmail: ctx.userSession!.email,
        action: 'PARTNER_PASSWORD_RESET',
        targetType: 'User',
        targetId: account.id,
        partnerId: input.partnerId,
      })

      return { accountEmail: account.email, temporaryPassword }
    }),

  // File de validation des demandes d'auto-inscription partenaire (statut
  // PENDING). Le compte de connexion existe déjà (créé PENDING par
  // registerPartner) : approuver/rejeter ne fait que changer le statut, ne
  // recrée rien.
  getPendingPartners: superAdminProcedure.query(async () => {
    return prisma.partner.findMany({
      where: { status: 'PENDING' },
      orderBy: { requestedAt: 'asc' },
      include: { users: { where: { role: Role.PARTNER }, select: { email: true, name: true, phone: true } } },
    })
  }),

  approvePartner: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const partner = await prisma.partner.findUnique({ where: { id: input.id } })
      if (!partner) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Partenaire introuvable.' })
      }
      if (partner.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cette demande a déjà été traitée.' })
      }
      const updated = await prisma.partner.update({
        where: { id: input.id },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      })
      await logActivity({
        userEmail: ctx.userSession!.email,
        action: 'PARTNER_APPROVED',
        targetType: 'Partner',
        targetId: partner.id,
        partnerId: partner.id,
      })
      return updated
    }),

  rejectPartner: superAdminProcedure
    .input(z.object({ id: z.string(), reason: z.string().trim().optional() }))
    .mutation(async ({ input, ctx }) => {
      const partner = await prisma.partner.findUnique({ where: { id: input.id } })
      if (!partner) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Partenaire introuvable.' })
      }
      if (partner.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cette demande a déjà été traitée.' })
      }
      const updated = await prisma.partner.update({
        where: { id: input.id },
        data: { status: 'REJECTED', reviewedAt: new Date() },
      })
      await logActivity({
        userEmail: ctx.userSession!.email,
        action: input.reason ? `PARTNER_REJECTED: ${input.reason}` : 'PARTNER_REJECTED',
        targetType: 'Partner',
        targetId: partner.id,
        partnerId: partner.id,
      })
      return updated
    }),

  deletePartner: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        // Delete LeadCaptures associated with partner
        await tx.leadCapture.deleteMany({
          where: { partnerId: input.id },
        })
        // Set campaign partnerId to null to avoid breaking referential integrity
        await tx.campaign.updateMany({
          where: { partnerId: input.id },
          data: { partnerId: null },
        })
        return tx.partner.delete({
          where: { id: input.id },
        })
      })
    }),

  // Homepage settings CRUD (admin)
  updateSiteSettings: superAdminProcedure
    .input(
      z.object({
        heroVideoData: z.string().nullable().optional(),
        heroVideoMimeType: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // ~20MB raw file cap, base64 inflates size by ~4/3
      const MAX_BASE64_LENGTH = 20 * 1024 * 1024 * 1.4
      if (input.heroVideoData && input.heroVideoData.length > MAX_BASE64_LENGTH) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La vidéo dépasse la limite de 20 Mo.',
        })
      }
      return prisma.siteSettings.upsert({
        where: { id: 'main' },
        create: {
          id: 'main',
          heroVideoData: input.heroVideoData || null,
          heroVideoMimeType: input.heroVideoMimeType || null,
          // The poster feature was retired — clear any leftover value on save.
          heroPosterData: null,
          heroPosterMimeType: null,
        },
        update: {
          heroVideoData: input.heroVideoData || null,
          heroVideoMimeType: input.heroVideoMimeType || null,
          heroPosterData: null,
          heroPosterMimeType: null,
        },
      })
    }),

  // Configuration du programme de fidélité « Points Merci » (Phase 1).
  // Stockée dans la ligne SiteSettings globale (id 'main'). Voir PLAN_FIDELITE.md.
  updateLoyaltyConfig: superAdminProcedure
    .input(
      z.object({
        loyaltyEnabled: z.boolean(),
        pointsPerTnd: z.number().min(0, 'Le taux ne peut pas être négatif.').max(1000),
        redeemPointsPerTnd: z.number().int().min(1, 'Au moins 1 point pour 1 TND.').max(1_000_000),
        minRedeemPoints: z.number().int().min(0).max(10_000_000),
        voucherValidityDays: z.number().int().min(1).max(3650),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.siteSettings.upsert({
        where: { id: 'main' },
        create: { id: 'main', ...input },
        update: { ...input },
      })
    }),

  // Réglages globaux (page "Paramètres") — séparé de updateSiteSettings (hero
  // vidéo) pour ne pas mélanger deux formulaires très différents.
  updateGlobalSettings: superAdminProcedure
    .input(
      z.object({
        referralBonusSpins: z.number().int().min(0).max(20),
        defaultSenderEmail: z.string().nullable().optional(),
        defaultSenderEmailPassword: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.siteSettings.upsert({
        where: { id: 'main' },
        create: {
          id: 'main',
          referralBonusSpins: input.referralBonusSpins,
          defaultSenderEmail: input.defaultSenderEmail || null,
          defaultSenderEmailPassword: input.defaultSenderEmailPassword
            ? encryptSecret(input.defaultSenderEmailPassword.replace(/\s+/g, ''))
            : null,
        },
        update: {
          referralBonusSpins: input.referralBonusSpins,
          defaultSenderEmail: input.defaultSenderEmail || null,
          // Blank password means "keep the existing one" — never echoed back to the client.
          ...(input.defaultSenderEmailPassword
            ? { defaultSenderEmailPassword: encryptSecret(input.defaultSenderEmailPassword.replace(/\s+/g, '')) }
            : {}),
        },
      })
    }),

  // Promo banners CRUD (admin)
  getAllPromoBanners: superAdminProcedure.query(async () => {
    return prisma.promoBanner.findMany({ orderBy: { order: 'asc' } })
  }),

  createPromoBanner: superAdminProcedure
    .input(
      z.object({
        imageData: z.string(),
        imageMimeType: z.string(),
        linkUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Accept bare domains ("obooking.com") in addition to fully-qualified URLs.
      // The link is optional — a banner can be purely visual with no destination.
      let normalizedUrl: string | null = null
      if (input.linkUrl && input.linkUrl.trim()) {
        normalizedUrl = /^https?:\/\//i.test(input.linkUrl) ? input.linkUrl : `https://${input.linkUrl}`
        try {
          new URL(normalizedUrl)
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: "Le lien de destination n'est pas une URL valide." })
        }
      }

      const maxOrder = await prisma.promoBanner.aggregate({ _max: { order: true } })
      return prisma.promoBanner.create({
        data: {
          imageData: input.imageData,
          imageMimeType: input.imageMimeType,
          linkUrl: normalizedUrl,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      })
    }),

  updatePromoBanner: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        linkUrl: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const normalizedUrl = input.linkUrl !== undefined
        ? (input.linkUrl && input.linkUrl.trim() ? (/^https?:\/\//i.test(input.linkUrl) ? input.linkUrl : `https://${input.linkUrl}`) : null)
        : undefined

      return prisma.promoBanner.update({
        where: { id: input.id },
        data: {
          ...(normalizedUrl !== undefined ? { linkUrl: normalizedUrl } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      })
    }),

  deletePromoBanner: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.promoBanner.delete({ where: { id: input.id } })
    }),

  // Réordonnancement en bloc (glisser-déposer via @dnd-kit) — reçoit l'ordre
  // complet des IDs plutôt que des swaps un-par-un.
  reorderPromoBanners: superAdminProcedure
    .input(z.object({ orderedIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await prisma.$transaction(
        input.orderedIds.map((id, index) => prisma.promoBanner.update({ where: { id }, data: { order: index } }))
      )
      return { success: true }
    }),

  // Campaigns CRUD
  getAllCampaigns: superAdminProcedure.query(async () => {
    const campaigns = await prisma.campaign.findMany({
      include: {
        partner: { select: { name: true, id: true } },
        _count: { select: { leads: true, prizes: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    // Never send the encrypted app password back to the client — only whether one is set.
    return campaigns.map(({ senderEmailPassword, ...campaign }) => ({
      ...campaign,
      hasSenderEmailPassword: !!senderEmailPassword,
    }))
  }),

  createCampaign: superAdminProcedure
    .input(
      z.object({
        partnerId: z.string().nullable().optional(),
        title: z.string().min(2, 'Title must be at least 2 characters'),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        isActive: z.boolean().default(true),
        isDraft: z.boolean().optional(),
        gameMode: z.enum(['ROULETTE', 'DRAW']).default('ROULETTE'),
        imageData: z.string().nullable().optional(),
        imageMimeType: z.string().nullable().optional(),
        senderEmail: z.string().nullable().optional(),
        senderEmailPassword: z.string().nullable().optional(),
        adBadge1: z.string().nullable().optional(),
        adTitle1: z.string().nullable().optional(),
        adDesc1: z.string().nullable().optional(),
        adBadge2: z.string().nullable().optional(),
        adTitle2: z.string().nullable().optional(),
        adDesc2: z.string().nullable().optional(),
        adBadge3: z.string().nullable().optional(),
        adTitle3: z.string().nullable().optional(),
        adDesc3: z.string().nullable().optional(),
        promoTitle: z.string().nullable().optional(),
        promoCode: z.string().nullable().optional(),
        promoDesc: z.string().nullable().optional(),
        promoUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sanitizedPartnerId = (input.partnerId && input.partnerId.trim() !== '' && input.partnerId !== 'null') ? input.partnerId : null;
      if (sanitizedPartnerId) {
        const partnerExists = await prisma.partner.findUnique({
          where: { id: sanitizedPartnerId }
        })
        if (!partnerExists) {
          throw new Error("Le partenaire sélectionné n'existe pas. Veuillez rafraîchir la page.")
        }
      }
      return prisma.campaign.create({
        data: {
          partnerId: sanitizedPartnerId,
          title: input.title,
          description: input.description || null,
          category: input.category || null,
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: input.isActive,
          ...(input.isDraft !== undefined ? { isDraft: input.isDraft } : {}),
          gameMode: input.gameMode,
          imageData: input.imageData || null,
          imageMimeType: input.imageMimeType || null,
          senderEmail: input.senderEmail || null,
          senderEmailPassword: input.senderEmailPassword ? encryptSecret(input.senderEmailPassword.replace(/\s+/g, '')) : null,
          adBadge1: input.adBadge1 || null,
          adTitle1: input.adTitle1 || null,
          adDesc1: input.adDesc1 || null,
          adBadge2: input.adBadge2 || null,
          adTitle2: input.adTitle2 || null,
          adDesc2: input.adDesc2 || null,
          adBadge3: input.adBadge3 || null,
          adTitle3: input.adTitle3 || null,
          adDesc3: input.adDesc3 || null,
          promoTitle: input.promoTitle || null,
          promoCode: input.promoCode || null,
          promoDesc: input.promoDesc || null,
          promoUrl: input.promoUrl || null,
        },
      })
    }),

  updateCampaign: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        partnerId: z.string().nullable().optional(),
        title: z.string().min(2, 'Title must be at least 2 characters'),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        isActive: z.boolean(),
        isDraft: z.boolean().optional(),
        gameMode: z.enum(['ROULETTE', 'DRAW']).default('ROULETTE'),
        imageData: z.string().nullable().optional(),
        imageMimeType: z.string().nullable().optional(),
        senderEmail: z.string().nullable().optional(),
        senderEmailPassword: z.string().nullable().optional(),
        adBadge1: z.string().nullable().optional(),
        adTitle1: z.string().nullable().optional(),
        adDesc1: z.string().nullable().optional(),
        adBadge2: z.string().nullable().optional(),
        adTitle2: z.string().nullable().optional(),
        adDesc2: z.string().nullable().optional(),
        adBadge3: z.string().nullable().optional(),
        adTitle3: z.string().nullable().optional(),
        adDesc3: z.string().nullable().optional(),
        promoTitle: z.string().nullable().optional(),
        promoCode: z.string().nullable().optional(),
        promoDesc: z.string().nullable().optional(),
        promoUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sanitizedPartnerId = (input.partnerId && input.partnerId.trim() !== '' && input.partnerId !== 'null') ? input.partnerId : null;
      if (sanitizedPartnerId) {
        const partnerExists = await prisma.partner.findUnique({
          where: { id: sanitizedPartnerId }
        })
        if (!partnerExists) {
          throw new Error("Le partenaire sélectionné n'existe pas. Veuillez rafraîchir la page.")
        }
      }
      return prisma.campaign.update({
        where: { id: input.id },
        data: {
          partnerId: sanitizedPartnerId,
          title: input.title,
          description: input.description || null,
          category: input.category || null,
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: input.isActive,
          ...(input.isDraft !== undefined ? { isDraft: input.isDraft } : {}),
          gameMode: input.gameMode,
          imageData: input.imageData || null,
          imageMimeType: input.imageMimeType || null,
          senderEmail: input.senderEmail || null,
          // Blank password means "keep the existing one" — it is never echoed back to the client.
          ...(input.senderEmailPassword ? { senderEmailPassword: encryptSecret(input.senderEmailPassword.replace(/\s+/g, '')) } : {}),
          adBadge1: input.adBadge1 || null,
          adTitle1: input.adTitle1 || null,
          adDesc1: input.adDesc1 || null,
          adBadge2: input.adBadge2 || null,
          adTitle2: input.adTitle2 || null,
          adDesc2: input.adDesc2 || null,
          adBadge3: input.adBadge3 || null,
          adTitle3: input.adTitle3 || null,
          adDesc3: input.adDesc3 || null,
          promoTitle: input.promoTitle || null,
          promoCode: input.promoCode || null,
          promoDesc: input.promoDesc || null,
          promoUrl: input.promoUrl || null,
        },
      })
    }),

  toggleCampaignActive: superAdminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.campaign.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
    }),

  deleteCampaign: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        // Delete UserPrizes won in prizes of this campaign
        await tx.userPrize.deleteMany({
          where: { prize: { campaignId: input.id } },
        })
        // Delete Prizes
        await tx.prize.deleteMany({
          where: { campaignId: input.id },
        })
        // Delete PlayTokens
        await tx.playToken.deleteMany({
          where: { campaignId: input.id },
        })
        // Delete LeadCaptures
        await tx.leadCapture.deleteMany({
          where: { campaignId: input.id },
        })
        // Delete Campaign itself
        return tx.campaign.delete({
          where: { id: input.id },
        })
      })
    }),

  // Duplique une campagne (infos + lots) en brouillon inactif — l'admin peut
  // ensuite l'ajuster et la publier sans repartir de zéro. Les liens de
  // fallback entre lots ne sont pas copiés (ils pointeraient vers l'ancienne
  // campagne) ; l'admin peut les redéfinir dans le wizard.
  duplicateCampaign: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const original = await prisma.campaign.findUnique({
        where: { id: input.id },
        include: { prizes: true },
      })
      if (!original) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campagne introuvable.' })
      }

      const { id, prizes, qrCodeToken, ...rest } = original
      const copy = await prisma.campaign.create({
        data: {
          ...rest,
          title: `${original.title} (copie)`,
          isActive: false,
          isDraft: true,
        },
      })

      if (prizes.length > 0) {
        await prisma.prize.createMany({
          data: prizes.map((p) => ({
            campaignId: copy.id,
            name: p.name,
            type: p.type,
            totalStock: p.totalStock,
            remainingStock: p.totalStock,
            winProbability: p.winProbability,
            color: p.color,
            imageData: p.imageData,
            imageMimeType: p.imageMimeType,
            drawDate: p.drawDate,
            validityDays: p.validityDays,
            order: p.order,
          })),
        })
      }

      return copy
    }),

  // Prizes CRUD
  getAllPrizes: superAdminProcedure.query(async () => {
    const prizes = await prisma.prize.findMany({
      include: {
        campaign: {
          select: {
            title: true,
            id: true,
            partnerId: true,
            partner: { select: { name: true } }
          }
        },
        winners: { include: { user: { select: { name: true, email: true } } } }
      },
      orderBy: { name: 'asc' },
    })

    const prizesWithCounts = await Promise.all(
      prizes.map(async (p) => {
        let participantCount = 0
        let participants: { id: string; name: string | null; email: string; phone: string | null; createdAt: Date }[] = []
        if (p.drawDate) {
          const tokens = await prisma.playToken.findMany({
            where: {
              campaignId: p.campaignId,
              earnedVia: EarnMethod.JOIN_DRAW,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc',
            }
          })

          const seen = new Set()
          for (const t of tokens) {
            if (!seen.has(t.user.id)) {
              seen.add(t.user.id)
              participants.push({
                id: t.user.id,
                name: t.user.name,
                email: t.user.email,
                phone: t.user.phone,
                createdAt: t.createdAt,
              })
            }
          }
          participantCount = participants.length
        }
        return {
          ...p,
          participantCount,
          participants,
        }
      })
    )

    return prizesWithCounts
  }),

  createPrize: superAdminProcedure
    .input(
      z.object({
        campaignId: z.string(),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        type: z.nativeEnum(PrizeType),
        totalStock: z.number().int(),
        winProbability: z.number().min(0).max(1),
        fallbackPrizeId: z.string().nullable().optional(),
        drawDate: z.coerce.date().nullable().optional(),
        validityDays: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const campaignExists = await prisma.campaign.findUnique({
        where: { id: input.campaignId }
      })
      if (!campaignExists) {
        throw new Error("La campagne sélectionnée n'existe pas. Veuillez rafraîchir la page.")
      }
      if (input.fallbackPrizeId && input.fallbackPrizeId.trim() !== '') {
        const fallbackExists = await prisma.prize.findUnique({
          where: { id: input.fallbackPrizeId }
        })
        if (!fallbackExists) {
          throw new Error("Le lot de consolation sélectionné n'existe pas. Veuillez rafraîchir la page.")
        }
      }
      const prize = await prisma.prize.create({
        data: {
          campaignId: input.campaignId,
          name: input.name,
          type: input.type,
          totalStock: input.totalStock,
          remainingStock: input.totalStock,
          winProbability: input.winProbability,
          fallbackPrizeId: input.fallbackPrizeId || null,
          drawDate: input.drawDate || null,
          validityDays: input.validityDays || null,
        },
      })

      // Sync remaining stock to Redis
      if (input.totalStock !== -1) {
        try {
          await redis.hset('prize:stocks', { [prize.id]: input.totalStock })
        } catch (err) {
          console.warn('[Redis Warning] Failed to initialize stock on Redis:', err)
        }
      }
      return prize
    }),

  updatePrize: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        campaignId: z.string(),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        type: z.nativeEnum(PrizeType),
        totalStock: z.number().int(),
        winProbability: z.number().min(0).max(1),
        fallbackPrizeId: z.string().nullable().optional(),
        drawDate: z.coerce.date().nullable().optional(),
        validityDays: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const campaignExists = await prisma.campaign.findUnique({
        where: { id: input.campaignId }
      })
      if (!campaignExists) {
        throw new Error("La campagne sélectionnée n'existe pas. Veuillez rafraîchir la page.")
      }
      if (input.fallbackPrizeId && input.fallbackPrizeId.trim() !== '') {
        const fallbackExists = await prisma.prize.findUnique({
          where: { id: input.fallbackPrizeId }
        })
        if (!fallbackExists) {
          throw new Error("Le lot de consolation sélectionné n'existe pas. Veuillez rafraîchir la page.")
        }
      }
      const oldPrize = await prisma.prize.findUnique({
        where: { id: input.id },
      })

      // Try to intelligently adjust remainingStock
      let updatedRemaining = input.totalStock
      if (oldPrize && oldPrize.totalStock !== -1 && input.totalStock !== -1) {
        const claimedCount = oldPrize.totalStock - oldPrize.remainingStock
        updatedRemaining = Math.max(0, input.totalStock - claimedCount)
      }

      const prize = await prisma.prize.update({
        where: { id: input.id },
        data: {
          campaignId: input.campaignId,
          name: input.name,
          type: input.type,
          totalStock: input.totalStock,
          remainingStock: updatedRemaining,
          winProbability: input.winProbability,
          fallbackPrizeId: input.fallbackPrizeId || null,
          drawDate: input.drawDate || null,
          validityDays: input.validityDays || null,
        },
      })

      // Update Redis cache
      try {
        if (input.totalStock === -1) {
          await redis.hdel('prize:stocks', prize.id)
        } else {
          await redis.hset('prize:stocks', { [prize.id]: updatedRemaining })
        }
      } catch (err) {
        console.warn('[Redis Warning] Failed to update stock in Redis:', err)
      }
      return prize
    }),

  deletePrize: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        // Nullify fallbackPrizeId references to this prize
        await tx.prize.updateMany({
          where: { fallbackPrizeId: input.id },
          data: { fallbackPrizeId: null },
        })
        // Delete won logs for this prize
        await tx.userPrize.deleteMany({
          where: { prizeId: input.id },
        })
        // Remove from Redis stock
        try {
          await redis.hdel('prize:stocks', input.id)
        } catch (err) {
          console.warn('[Redis Warning] Failed to delete stock key in Redis:', err)
        }
        return tx.prize.delete({
          where: { id: input.id },
        })
      })
    }),

  runDraw: partnerProcedure
    .input(z.object({ prizeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const prize = await prisma.prize.findUnique({
        where: { id: input.prizeId },
        include: { winners: { include: { user: true } } }
      })
      if (!prize) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Le lot n'existe pas.",
        })
      }

      // Vérifie l'appartenance avant tout check métier, pour ne pas laisser
      // fuiter d'informations sur l'état d'un lot d'un autre partenaire
      // (ex: "pas configuré pour un tirage") via les messages d'erreur.
      const campaignForDraw = await prisma.campaign.findUnique({ where: { id: prize.campaignId } })
      if (session.role !== Role.SUPERADMIN && campaignForDraw?.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Ce lot n'appartient pas à votre partenaire." })
      }

      if (!prize.drawDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Ce lot n'est pas configuré pour un tirage au sort  .",
        })
      }
      if (prize.winners.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Le tirage au sort a déjà été effectué pour ce lot.",
        })
      }

      // 1. Fetch all participants for this campaign who completed JOIN_DRAW
      const participants = await prisma.playToken.findMany({
        where: {
          campaignId: prize.campaignId,
          earnedVia: EarnMethod.JOIN_DRAW
        },
        include: { user: true }
      })

      if (participants.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Aucun participant n'est inscrit à ce tirage au sort pour le moment.",
        })
      }

      // Extract unique users to prevent double draw entries if any
      const uniqueUsersMap = new Map<string, typeof participants[0]['user']>()
      for (const p of participants) {
        uniqueUsersMap.set(p.user.id, p.user)
      }
      let eligibleUsers = Array.from(uniqueUsersMap.values())

      // If the campaign disallows winning more than one prize, exclude anyone
      // who already won any other prize belonging to this same campaign.
      if (campaignForDraw && !campaignForDraw.allowMultipleWins) {
        const priorWinners = await prisma.userPrize.findMany({
          where: { prize: { campaignId: prize.campaignId } },
          select: { userId: true },
        })
        const alreadyWon = new Set(priorWinners.map((w) => w.userId))
        eligibleUsers = eligibleUsers.filter((u) => !alreadyWon.has(u.id))
      }

      if (eligibleUsers.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Aucun participant éligible : tous les inscrits ont déjà gagné un autre lot de cette campagne.",
        })
      }

      // 2. Determine number of winners to draw based on stock (minimum 1, up to remaining stock or number of eligible users)
      const countToDraw = prize.totalStock > 0 ? Math.min(prize.totalStock, eligibleUsers.length) : 1

      // 3. Select random winner(s) using a cryptographically secure Fisher-Yates shuffle
      // Math.random() is statistically biased and non-cryptographic — use crypto.getRandomValues instead,
      // consistent with the approach already used in spinRoulette.
      const shuffled = [...eligibleUsers]
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Draw a secure random index in [0, i] without modulo bias
        const randomBytes = new Uint32Array(1)
        crypto.getRandomValues(randomBytes)
        const j = Math.floor((randomBytes[0] / (0xFFFFFFFF + 1)) * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      const winners = shuffled.slice(0, countToDraw)

      // 4. Create UserPrize records and update stock
      const winnerUserPrizeIds = new Map<string, string>()
      await prisma.$transaction(async (tx) => {
        for (const winner of winners) {
          const created = await tx.userPrize.create({
            data: {
              userId: winner.id,
              prizeId: prize.id,
              status: 'DELIVERED',
            }
          })
          winnerUserPrizeIds.set(winner.id, created.id)
        }

        await tx.prize.update({
          where: { id: prize.id },
          data: {
            remainingStock: prize.totalStock > 0 ? Math.max(0, prize.totalStock - winners.length) : 0
          }
        })
      })

      // 5. Notify each winner by email, sent from the partner/agency's own address.
      // Never allowed to break the draw flow — failures are only logged.
      try {
        const campaign = await prisma.campaign.findUnique({
          where: { id: prize.campaignId },
          include: { partner: true },
        })
        const senderCreds = campaign ? await resolveSenderCredentials(campaign) : null
        if (campaign && senderCreds) {
          const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
          await Promise.all(
            winners.map((winner) => {
              const userPrizeId = winnerUserPrizeIds.get(winner.id) || winner.id
              return sendWinnerEmail({
                to: winner.email,
                winnerName: winner.name,
                prizeName: prize.name,
                partnerName: campaign.partner?.name || campaign.title,
                senderEmail: senderCreds.senderEmail,
                senderEmailPassword: senderCreds.senderEmailPassword,
                confirmationCode: userPrizeId.slice(-8).toUpperCase(),
                voucherUrl: `${baseUrl}/voucher/${userPrizeId}`,
              }).catch((mailErr) =>
                console.warn(`[Email Warning] Failed to send draw winner email to ${winner.email}:`, mailErr)
              )
            })
          )
        }
      } catch (mailErr) {
        console.warn('[Email Warning] Failed to send draw winner notification emails:', mailErr)
      }

      return {
        success: true,
        winners: winners.map(w => ({ id: w.id, name: w.name, email: w.email }))
      }
    }),

  // Vue dédiée pour la page de réglages "Tirage au sort" d'une campagne :
  // lots, nombre d'inscrits par lot, gagnants déjà tirés, et réglages globaux.
  getDrawCampaignOverview: partnerProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const campaign = await prisma.campaign.findUnique({
        where: { id: input.campaignId },
        include: {
          prizes: {
            orderBy: { order: 'asc' },
            include: { winners: { include: { user: { select: { name: true, email: true } } } } },
          },
        },
      })
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campagne introuvable.' })
      }
      if (session.role !== Role.SUPERADMIN && campaign.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Cette campagne n'appartient pas à votre partenaire." })
      }

      // Liste des inscrits au tirage (JOIN_DRAW), calculée UNE fois pour toute
      // la campagne (dédupliquée par utilisateur) — avant, une requête par lot
      // pour la même donnée.
      const drawTokens = await prisma.playToken.findMany({
        where: { campaignId: campaign.id, earnedVia: EarnMethod.JOIN_DRAW },
        select: { user: { select: { id: true, name: true, email: true, phone: true } } },
      })
      const participantsMap = new Map<string, { id: string; name: string | null; email: string; phone: string | null }>()
      for (const t of drawTokens) {
        if (t.user) participantsMap.set(t.user.id, t.user)
      }
      const participants = Array.from(participantsMap.values())
      const participantCount = participants.length

      const prizesWithCounts = campaign.prizes.map((p) => ({
        id: p.id,
        name: p.name,
        totalStock: p.totalStock,
        drawDate: p.drawDate,
        participantCount,
        winners: p.winners.map((w) => ({
          id: w.id,
          name: w.user.name,
          email: w.user.email,
          claimedAt: w.claimedAt,
        })),
      }))

      return {
        id: campaign.id,
        title: campaign.title,
        allowMultipleWins: campaign.allowMultipleWins,
        drawDate: campaign.prizes[0]?.drawDate ?? null,
        participants,
        prizes: prizesWithCounts,
      }
    }),

  updateDrawSettings: partnerProcedure
    .input(
      z.object({
        campaignId: z.string(),
        allowMultipleWins: z.boolean(),
        drawDate: z.coerce.date().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId } })
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campagne introuvable.' })
      }
      if (session.role !== Role.SUPERADMIN && campaign.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Cette campagne n'appartient pas à votre partenaire." })
      }
      await prisma.campaign.update({
        where: { id: input.campaignId },
        data: { allowMultipleWins: input.allowMultipleWins },
      })
      await prisma.prize.updateMany({
        where: { campaignId: input.campaignId },
        data: { drawDate: input.drawDate },
      })
      return { success: true }
    }),

  updatePrizeWinnerCount: partnerProcedure
    .input(z.object({ prizeId: z.string(), totalStock: z.number().int().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const prize = await prisma.prize.findUnique({
        where: { id: input.prizeId },
        include: { campaign: true },
      })
      if (!prize) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lot introuvable.' })
      }
      if (session.role !== Role.SUPERADMIN && prize.campaign.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Ce lot n'appartient pas à votre partenaire." })
      }
      return prisma.prize.update({
        where: { id: input.prizeId },
        data: { totalStock: input.totalStock },
      })
    }),

  // Users & Tokens CRUD
  getAllUsers: superAdminProcedure.query(async () => {
    const users = await prisma.user.findMany({
      include: {
        partner: { select: { id: true, name: true } },
        playTokens: {
          select: { id: true, status: true, campaignId: true },
        },
        wonPrizes: {
          select: { id: true, prize: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return users.map((user) => {
      // Count unused and used tokens grouped by campaignId
      const tokensByCampaign: Record<string, { unused: number; used: number }> = {}
      user.playTokens.forEach((t) => {
        if (!tokensByCampaign[t.campaignId]) {
          tokensByCampaign[t.campaignId] = { unused: 0, used: 0 }
        }
        if (t.status === TokenStatus.UNUSED) {
          tokensByCampaign[t.campaignId].unused++
        } else if (t.status === TokenStatus.USED) {
          tokensByCampaign[t.campaignId].used++
        }
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
        // Rattachement partenaire/agence — permet de filtrer les comptes par
        // entreprise dans l'onglet Utilisateurs (partenaire vs agence).
        partnerId: user.partnerId,
        partnerName: user.partner?.name ?? null,
        tokensByCampaign,
        wonPrizesCount: user.wonPrizes.length,
        wonPrizes: user.wonPrizes.map((wp) => wp.prize.name),
      }
    })
  }),

  // ── Gestion des CLIENTS fidélité (Customer) par le super admin ──────────────
  // Distinct des User (admin/partenaire/joueur) : ce sont les voyageurs qui
  // achètent des services obooking et cumulent des « points merci ».

  getAllCustomers: superAdminProcedure.query(async () => {
    const customers = await prisma.customer.findMany({
      include: {
        partner: { select: { id: true, name: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return customers.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      points: c.points,
      partnerId: c.partnerId,
      partnerName: c.partner?.name ?? null,
      purchaseCount: c._count.purchases,
      createdAt: c.createdAt,
    }))
  }),

  adminCreateCustomer: superAdminProcedure
    .input(
      z.object({
        email: z.string().trim().email('Adresse email invalide.'),
        name: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
        partnerId: z.string().nullable().optional(),
        initialPoints: z.number().int().min(0).max(10_000_000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.customer.findUnique({ where: { email: input.email } })
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: `L'adresse ${input.email} a déjà un compte client.` })
      }
      const passwordHash = await bcrypt.hash(input.password, 10)
      const initial = input.initialPoints || 0
      const customer = await prisma.customer.create({
        data: {
          email: input.email,
          name: input.name || null,
          phone: input.phone || null,
          passwordHash,
          partnerId: input.partnerId || null,
          points: initial,
        },
      })
      // Tracer les points initiaux dans le grand livre (source de vérité).
      if (initial > 0) {
        await prisma.pointTransaction.create({
          data: {
            customerId: customer.id,
            delta: initial,
            type: 'ADMIN_ADJUST',
            reason: 'Points initiaux à la création du compte',
            balanceAfter: initial,
          },
        })
      }
      return { id: customer.id, email: customer.email }
    }),

  adminUpdateCustomer: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().trim().email('Adresse email invalide.'),
        name: z.string().trim().nullable().optional(),
        phone: z.string().trim().nullable().optional(),
        partnerId: z.string().nullable().optional(),
        // Optionnel : si fourni, réinitialise le mot de passe (min. 8). Vide =
        // mot de passe inchangé. On ne peut jamais LIRE l'ancien (hash bcrypt).
        newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.customer.findUnique({ where: { id: input.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client introuvable.' })
      if (input.email !== existing.email) {
        const taken = await prisma.customer.findUnique({ where: { email: input.email } })
        if (taken) throw new TRPCError({ code: 'CONFLICT', message: `L'adresse ${input.email} est déjà utilisée.` })
      }
      const data: any = {
        email: input.email,
        name: input.name ?? null,
        phone: input.phone ?? null,
        partnerId: input.partnerId || null,
      }
      if (input.newPassword) {
        data.passwordHash = await bcrypt.hash(input.newPassword, 10)
      }
      await prisma.customer.update({ where: { id: input.id }, data })
      return { success: true }
    }),

  adminAdjustCustomerPoints: superAdminProcedure
    .input(
      z.object({
        customerId: z.string(),
        delta: z.number().int(),
        reason: z.string().trim().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: input.customerId } })
        if (!customer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client introuvable.' })
        const newBalance = customer.points + input.delta
        if (newBalance < 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Le solde ne peut pas devenir négatif.' })
        }
        await tx.customer.update({ where: { id: customer.id }, data: { points: newBalance } })
        await tx.pointTransaction.create({
          data: {
            customerId: customer.id,
            delta: input.delta,
            type: 'ADMIN_ADJUST',
            reason: input.reason || null,
            balanceAfter: newBalance,
          },
        })
        return { points: newBalance }
      })
    }),

  adminDeleteCustomer: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Dépendances RESTRICT à purger d'abord ; les achats gardent une trace
      // (customerId délié) pour ne pas perdre l'historique comptable.
      await prisma.$transaction([
        prisma.pointTransaction.deleteMany({ where: { customerId: input.id } }),
        prisma.loyaltyVoucher.deleteMany({ where: { customerId: input.id } }),
        prisma.customerPasswordReset.deleteMany({ where: { customerId: input.id } }),
        prisma.loyaltyPurchase.updateMany({ where: { customerId: input.id }, data: { customerId: null } }),
        prisma.customer.delete({ where: { id: input.id } }),
      ])
      return { success: true }
    }),

  createUser: superAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        role: z.nativeEnum(Role).default(Role.PLAYER),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.user.create({
        data: {
          email: input.email,
          name: input.name || null,
          phone: input.phone || null,
          role: input.role,
        },
      })
    }),

  updateUser: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        role: z.nativeEnum(Role),
        playTokensCount: z.number().int().optional(),
        campaignIdForTokens: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.update({
        where: { id: input.id },
        data: {
          email: input.email,
          name: input.name || null,
          phone: input.phone || null,
          role: input.role,
        },
      })

      // Set/Adjust tokens for a specific campaign if provided
      if (input.campaignIdForTokens && typeof input.playTokensCount === 'number') {
        const campaignExists = await prisma.campaign.findUnique({
          where: { id: input.campaignIdForTokens }
        })
        if (!campaignExists) {
          throw new Error("La campagne sélectionnée pour les jetons n'existe pas. Veuillez rafraîchir la page.")
        }
        const currentUnusedCount = await prisma.playToken.count({
          where: {
            userId: input.id,
            campaignId: input.campaignIdForTokens,
            status: TokenStatus.UNUSED,
          },
        })

        const diff = input.playTokensCount - currentUnusedCount
        if (diff > 0) {
          // Add tokens
          await prisma.playToken.createMany({
            data: Array.from({ length: diff }).map(() => ({
              userId: input.id,
              campaignId: input.campaignIdForTokens!,
              earnedVia: EarnMethod.ADMIN_GRANT,
              status: TokenStatus.UNUSED,
            })),
          })
        } else if (diff < 0) {
          // Remove some unused tokens
          const tokensToDelete = await prisma.playToken.findMany({
            where: {
              userId: input.id,
              campaignId: input.campaignIdForTokens,
              status: TokenStatus.UNUSED,
            },
            take: Math.abs(diff),
            select: { id: true },
          })

          await prisma.playToken.deleteMany({
            where: {
              id: { in: tokensToDelete.map((t) => t.id) },
            },
          })
        }
      }

      return user
    }),

  deleteUser: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        // Delete all play tokens
        await tx.playToken.deleteMany({
          where: { userId: input.id },
        })
        // Delete won prizes logs
        await tx.userPrize.deleteMany({
          where: { userId: input.id },
        })
        // Delete lead capture references
        await tx.leadCapture.deleteMany({
          where: { userId: input.id },
        })
        // Nullify referrals referredById
        await tx.user.updateMany({
          where: { referredById: input.id },
          data: { referredById: null },
        })
        // Finally, delete the user
        return tx.user.delete({
          where: { id: input.id },
        })
      })
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Jeux-concours : templates, activity log, config roulette/tirage par campagne
  // ─────────────────────────────────────────────────────────────────────────

  // Liste des templates préconfigurés pour la config roulette/tirage
  getCampaignTemplates: adminProcedure.query(async () => {
    return CAMPAIGN_TEMPLATES
  }),

  // Bascule rapide Roulette/Tirage depuis le tableau des campagnes
  setCampaignGameMode: writeProcedure
    .input(z.object({ id: z.string(), gameMode: z.enum(['ROULETTE', 'DRAW']) }))
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const campaignToUpdate = await prisma.campaign.findUnique({ where: { id: input.id } })
      if (!campaignToUpdate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campagne introuvable.' })
      }
      if (session.role !== Role.SUPERADMIN && campaignToUpdate.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Cette campagne n'appartient pas à votre partenaire." })
      }

      const updated = await prisma.campaign.update({
        where: { id: input.id },
        data: { gameMode: input.gameMode },
      })
      if (input.gameMode === 'DRAW') {
        // totalStock <= 0 is a valid "stock illimité" value in Roulette mode,
        // but in Draw mode the same column means "nombre de gagnants à
        // tirer" — a prize carried over from Roulette can otherwise show a
        // nonsensical "Gagnants : -1" until an admin edits it manually.
        await prisma.prize.updateMany({
          where: { campaignId: input.id, totalStock: { lte: 0 } },
          data: { totalStock: 1 },
        })
      }
      await logActivity({
        userEmail: ctx.userSession!.email,
        action: `SET_GAME_MODE_${input.gameMode}`,
        targetType: 'Campaign',
        targetId: input.id,
      })
      return updated
    }),

  // Journal d'activité admin (création/édition de campagne, statut gagnant, etc.)
  getActivityLogs: adminProcedure
    .input(
      z.object({
        targetType: z.string().optional(),
        targetId: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // ActivityLog a une colonne partnerId depuis la Phase 1, mais aucun
      // filtre par partenaire n'a encore été écrit ici : on continue de
      // refuser l'accès aux comptes PARTNER plutôt que de renvoyer un
      // journal non filtré qui exposerait l'activité d'autres partenaires
      // (vérifié : aucune autre procédure ne lit ActivityLog).
      if (ctx.userSession!.role !== Role.SUPERADMIN) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Action réservée aux super-administrateurs.' })
      }
      return prisma.activityLog.findMany({
        where: {
          ...(input?.targetType ? { targetType: input.targetType } : {}),
          ...(input?.targetId ? { targetId: input.targetId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 50,
      })
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Configuration roulette/tirage par campagne
  // ─────────────────────────────────────────────────────────────────────────

  updateCampaignGameConfig: writeProcedure
    .input(
      z.object({
        id: z.string(),
        spinsPerClient: z.number().int().min(1).max(20).optional(),
        postSignupMessage: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const { id, ...rest } = input
      const campaignToUpdate = await prisma.campaign.findUnique({ where: { id } })
      if (!campaignToUpdate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campagne introuvable.' })
      }
      if (session.role !== Role.SUPERADMIN && campaignToUpdate.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Cette campagne n'appartient pas à votre partenaire." })
      }
      const data: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) data[key] = value
      }
      return prisma.campaign.update({ where: { id }, data })
    }),

  getCampaignWithPrizes: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
        include: { prizes: { orderBy: { order: 'asc' } } },
      })
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campagne introuvable.' })
      }
      if (session.role !== Role.SUPERADMIN && campaign.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Cette campagne n'appartient pas à votre partenaire." })
      }
      return campaign
    }),

  // Remplace en bloc les lots/segments d'une campagne (création + mise à jour +
  // suppression de ceux retirés) — simplifie l'édition depuis le wizard, qui
  // manipule toute la liste d'un coup plutôt qu'un lot à la fois.
  upsertPrizesForCampaign: partnerProcedure
    .input(
      z.object({
        campaignId: z.string(),
        prizes: z.array(
          z.object({
            id: z.string().optional(),
            name: z.string().min(1),
            type: z.nativeEnum(PrizeType).default(PrizeType.PHYSICAL),
            totalStock: z.number().int(),
            winProbability: z.number().min(0).max(1).default(0),
            color: z.string().nullable().optional(),
            textColor: z.string().nullable().optional(),
            imageData: z.string().nullable().optional(),
            imageMimeType: z.string().nullable().optional(),
            fallbackPrizeId: z.string().nullable().optional(),
            drawDate: z.coerce.date().nullable().optional(),
            validityDays: z.number().int().nullable().optional(),
            order: z.number().int().default(0),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.userSession!
      const campaignExists = await prisma.campaign.findUnique({ where: { id: input.campaignId } })
      if (!campaignExists) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campagne introuvable.' })
      }
      if (session.role !== Role.SUPERADMIN && campaignExists.partnerId !== session.partnerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "Cette campagne n'appartient pas à votre partenaire." })
      }

      const existing = await prisma.prize.findMany({
        where: { campaignId: input.campaignId },
        include: { winners: { select: { id: true } } },
      })
      const incomingIds = new Set(input.prizes.filter((p) => p.id).map((p) => p.id))
      const toDelete = existing.filter((p) => !incomingIds.has(p.id) && p.winners.length === 0)

      await prisma.$transaction([
        ...toDelete.map((p) => prisma.prize.updateMany({ where: { fallbackPrizeId: p.id }, data: { fallbackPrizeId: null } })),
        ...toDelete.map((p) => prisma.prize.delete({ where: { id: p.id } })),
        ...input.prizes.map((p) =>
          p.id
            ? prisma.prize.update({
                where: { id: p.id },
                data: {
                  name: p.name,
                  type: p.type,
                  totalStock: p.totalStock,
                  winProbability: p.winProbability,
                  color: p.color ?? null,
                  textColor: p.textColor ?? null,
                  imageData: p.imageData ?? null,
                  imageMimeType: p.imageMimeType ?? null,
                  fallbackPrizeId: p.fallbackPrizeId || null,
                  drawDate: p.drawDate || null,
                  validityDays: p.validityDays ?? 30,
                  order: p.order,
                },
              })
            : prisma.prize.create({
                data: {
                  campaignId: input.campaignId,
                  name: p.name,
                  type: p.type,
                  totalStock: p.totalStock,
                  remainingStock: p.totalStock,
                  winProbability: p.winProbability,
                  color: p.color ?? null,
                  textColor: p.textColor ?? null,
                  imageData: p.imageData ?? null,
                  imageMimeType: p.imageMimeType ?? null,
                  fallbackPrizeId: p.fallbackPrizeId || null,
                  drawDate: p.drawDate || null,
                  validityDays: p.validityDays ?? 30,
                  order: p.order,
                },
              })
        ),
      ])

      // Best-effort Redis stock sync (never blocks the response)
      try {
        const refreshed = await prisma.prize.findMany({ where: { campaignId: input.campaignId } })
        for (const p of refreshed) {
          if (p.totalStock === -1) {
            await redis.hdel('prize:stocks', p.id)
          } else {
            await redis.hset('prize:stocks', { [p.id]: p.remainingStock })
          }
        }
      } catch (err) {
        console.warn('[Redis Warning] Failed to sync stock after upsertPrizesForCampaign:', err)
      }

      return prisma.prize.findMany({ where: { campaignId: input.campaignId }, orderBy: { order: 'asc' } })
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // Espace client final (voyageurs) — modèle Customer, auth et session
  // (customer_session, voir src/lib/auth.ts) entièrement séparés de
  // User/Role (SUPERADMIN/PARTNER/READONLY). Voir ESPACE_CLIENT.md.
  // ═══════════════════════════════════════════════════════════════════════

  registerCustomer: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email('Adresse email invalide.'),
        password: z.string(),
        name: z.string().trim().optional(),
        phone: z.string().trim().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const identifier = `customer-signup:${ctx.ip || 'unknown'}`
      let allowed: boolean
      try {
        const res = await authRatelimit.limit(identifier)
        allowed = res.success
      } catch (err) {
        console.error('[RateLimit ERROR] authRatelimit indisponible pour registerCustomer — requête refusée par précaution (fail-closed):', err)
        allowed = false
      }
      if (!allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives. Réessayez dans une heure.' })
      }

      const strengthError = checkPasswordStrength(input.password)
      if (strengthError) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: strengthError })
      }

      // Anti-énumération : réponse identique que l'email existe déjà ou non,
      // aucune création en cas de collision.
      const GENERIC_MESSAGE = 'Si cette adresse est valide, votre compte a été créé. Vous pouvez maintenant vous connecter.'

      const existing = await prisma.customer.findUnique({ where: { email: input.email } })
      if (existing) {
        return { success: true, message: GENERIC_MESSAGE }
      }

      const passwordHash = await bcrypt.hash(input.password, 10)
      await prisma.customer.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name || null,
          phone: input.phone || null,
        },
      })

      return { success: true, message: GENERIC_MESSAGE }
    }),

  loginCustomer: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Rate limit PAR COMPTE (email), pas par IP : évite qu'un client (ou tous
      // les clients derrière une même IP/box/4G) se retrouvent bloqués par les
      // tentatives d'un autre. 8 essais / 15 min et par email.
      const identifier = `customer-login:${input.email.trim().toLowerCase()}`
      let allowed: boolean
      try {
        const res = await customerLoginRatelimit.limit(identifier)
        allowed = res.success
      } catch (err) {
        console.error('[RateLimit ERROR] customerLoginRatelimit indisponible pour loginCustomer — requête refusée par précaution (fail-closed):', err)
        allowed = false
      }
      if (!allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives de connexion pour ce compte. Réessayez dans quelques minutes.' })
      }

      // Message identique que le compte existe ou non (même logique que loginAdmin).
      const customer = await prisma.customer.findUnique({ where: { email: input.email } })
      if (!customer) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Adresse email ou mot de passe incorrect.' })
      }
      const isValid = await bcrypt.compare(input.password, customer.passwordHash)
      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Adresse email ou mot de passe incorrect.' })
      }

      const token = await createCustomerSessionToken({ customerId: customer.id, email: customer.email })
      return { token }
    }),

  logoutCustomer: publicProcedure.mutation(async () => {
    return { success: true }
  }),

  requestCustomerPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const identifier = `customer-reset:${ctx.ip || 'unknown'}`
      let allowed: boolean
      try {
        const res = await authRatelimit.limit(identifier)
        allowed = res.success
      } catch (err) {
        console.error('[RateLimit ERROR] authRatelimit indisponible pour requestCustomerPasswordReset — requête refusée par précaution (fail-closed):', err)
        allowed = false
      }
      if (!allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives. Réessayez dans une heure.' })
      }

      const GENERIC_MESSAGE = 'Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.'

      const customer = await prisma.customer.findUnique({ where: { email: input.email } })
      if (!customer) {
        return { success: true, message: GENERIC_MESSAGE }
      }

      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
      await prisma.customerPasswordReset.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      })

      // Envoi best-effort — ne doit jamais faire échouer la mutation, ni
      // révéler quoi que ce soit sur l'existence du compte au demandeur.
      try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } })
        if (settings?.defaultSenderEmail && settings?.defaultSenderEmailPassword) {
          const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
          await sendCustomerPasswordResetEmail({
            to: customer.email,
            resetUrl: `${baseUrl}/client/reset-password?token=${rawToken}`,
            senderEmail: settings.defaultSenderEmail,
            senderEmailPassword: settings.defaultSenderEmailPassword,
          })
        }
      } catch (err) {
        console.warn('[Email Warning] Failed to send customer password reset email:', err)
      }

      return { success: true, message: GENERIC_MESSAGE }
    }),

  resetCustomerPasswordWithToken: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string() }))
    .mutation(async ({ input }) => {
      const strengthError = checkPasswordStrength(input.newPassword)
      if (strengthError) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: strengthError })
      }

      const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex')
      const resetRequest = await prisma.customerPasswordReset.findUnique({ where: { tokenHash } })
      if (!resetRequest || resetRequest.usedAt || resetRequest.expiresAt < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ce lien de réinitialisation est invalide ou a expiré.' })
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 10)
      await prisma.$transaction([
        prisma.customer.update({ where: { id: resetRequest.customerId }, data: { passwordHash } }),
        prisma.customerPasswordReset.update({ where: { id: resetRequest.id }, data: { usedAt: new Date() } }),
      ])

      return { success: true }
    }),

  getMyProfile: customerProcedure.query(async ({ ctx }) => {
    const customer = await prisma.customer.findUnique({
      where: { id: ctx.customerSession!.customerId },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    })
    if (!customer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable.' })
    }
    return customer
  }),

  updateMyProfile: customerProcedure
    .input(z.object({ name: z.string().trim().nullable().optional(), phone: z.string().trim().nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      return prisma.customer.update({
        where: { id: ctx.customerSession!.customerId },
        data: {
          name: input.name ?? undefined,
          phone: input.phone ?? undefined,
        },
        select: { id: true, email: true, name: true, phone: true },
      })
    }),

  // Garde-fou strict : ne lit jamais un id fourni par le client, uniquement
  // ctx.customerSession.customerId — un client ne peut donc jamais consulter
  // les participations/lots d'un autre client ni d'un autre partenaire.
  getMyGameActivity: customerProcedure.query(async ({ ctx }) => {
    const customer = await prisma.customer.findUnique({ where: { id: ctx.customerSession!.customerId } })
    if (!customer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable.' })
    }

    let userId = customer.userId
    if (!userId) {
      // Rattachement best-effort : un joueur ayant déjà participé avec ce
      // même email avant de créer un compte client est relié maintenant.
      const existingUser = await prisma.user.findUnique({ where: { email: customer.email } })
      if (existingUser) {
        await prisma.customer.update({ where: { id: customer.id }, data: { userId: existingUser.id } })
        userId = existingUser.id
      }
    }

    if (!userId) {
      return { participations: [], prizesWon: [] }
    }

    const [tokens, prizes] = await Promise.all([
      prisma.playToken.findMany({
        where: { userId },
        include: { campaign: { select: { id: true, title: true, gameMode: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userPrize.findMany({
        where: { userId },
        include: { prize: { select: { name: true, type: true, campaign: { select: { id: true, title: true } } } } },
        orderBy: { claimedAt: 'desc' },
      }),
    ])

    return {
      participations: tokens.map((t) => ({
        id: t.id,
        campaignId: t.campaign.id,
        campaignTitle: t.campaign.title,
        gameMode: t.campaign.gameMode,
        status: t.status,
        earnedVia: t.earnedVia,
        createdAt: t.createdAt,
      })),
      prizesWon: prizes.map((p) => ({
        id: p.id,
        prizeName: p.prize.name,
        prizeType: p.prize.type,
        campaignId: p.prize.campaign.id,
        campaignTitle: p.prize.campaign.title,
        status: p.status,
        claimedAt: p.claimedAt,
      })),
    }
  }),

  // Consomme uniquement l'interface ObookingDataSource (src/lib/obookingDataSource.ts)
  // — jamais MockObookingDataSource directement. Voir ESPACE_CLIENT.md.
  // Achats réels du client (transmis par obooking.tn, table LoyaltyPurchase).
  getMyPurchases: customerProcedure.query(async ({ ctx }) => {
    const purchases = await prisma.loyaltyPurchase.findMany({
      where: { customerId: ctx.customerSession!.customerId },
      orderBy: { purchasedAt: 'desc' },
    })
    return purchases.map((p) => ({
      id: p.id,
      label: p.description || 'Achat obooking',
      amount: p.amountTnd,
      currency: 'TND',
      purchasedAt: p.purchasedAt.toISOString(),
      pointsEarned: p.pointsEarned,
      status: p.status,
    }))
  }),

  // Solde de points réel (Customer.points). Forme conservée { balance, updatedAt }
  // pour rester compatible avec les pages existantes.
  getMyLoyaltyPoints: customerProcedure.query(async ({ ctx }) => {
    const customer = await prisma.customer.findUnique({ where: { id: ctx.customerSession!.customerId } })
    return { balance: customer?.points ?? 0, updatedAt: (customer?.updatedAt ?? new Date()).toISOString() }
  }),

  // Historique des mouvements de points (grand livre).
  getMyPointsHistory: customerProcedure.query(async ({ ctx }) => {
    const txns = await prisma.pointTransaction.findMany({
      where: { customerId: ctx.customerSession!.customerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return txns.map((t) => ({
      id: t.id,
      delta: t.delta,
      type: t.type,
      reason: t.reason,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt.toISOString(),
    }))
  }),

  // Bons de réduction du client (générés par conversion de points).
  getMyVouchers: customerProcedure.query(async ({ ctx }) => {
    const vouchers = await prisma.loyaltyVoucher.findMany({
      where: { customerId: ctx.customerSession!.customerId },
      orderBy: { createdAt: 'desc' },
    })
    const now = Date.now()
    return vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      pointsSpent: v.pointsSpent,
      valueTnd: v.valueTnd,
      status: v.expiresAt && v.expiresAt.getTime() < now && v.status === 'ACTIVE' ? 'EXPIRED' : v.status,
      expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
      createdAt: v.createdAt.toISOString(),
    }))
  }),

  // Config publique du programme (taux de conversion) — pour que l'espace
  // client puisse calculer et afficher la valeur d'une conversion.
  getLoyaltyPublicConfig: publicProcedure.query(async () => {
    const s = await prisma.siteSettings.findUnique({ where: { id: 'main' } })
    return {
      loyaltyEnabled: s?.loyaltyEnabled ?? false,
      redeemPointsPerTnd: s?.redeemPointsPerTnd ?? 100,
      minRedeemPoints: s?.minRedeemPoints ?? 500,
      voucherValidityDays: s?.voucherValidityDays ?? 90,
    }
  }),

  // Conversion de points → bon de réduction TND. Transactionnel : débite les
  // points, trace le mouvement, crée le bon avec un code unique.
  redeemMyPoints: customerProcedure
    .input(z.object({ points: z.number().int().positive('Le nombre de points doit être positif.') }))
    .mutation(async ({ input, ctx }) => {
      const customerId = ctx.customerSession!.customerId
      return prisma.$transaction(async (tx) => {
        const settings = await tx.siteSettings.findUnique({ where: { id: 'main' } })
        if (!settings?.loyaltyEnabled) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Le programme de fidélité est actuellement désactivé.' })
        }
        const redeemRate = settings.redeemPointsPerTnd || 100
        const minRedeem = settings.minRedeemPoints ?? 0
        const validityDays = settings.voucherValidityDays ?? 90

        const customer = await tx.customer.findUnique({ where: { id: customerId } })
        if (!customer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable.' })
        if (input.points < minRedeem) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Il faut au moins ${minRedeem} points pour convertir.` })
        }
        if (input.points > customer.points) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solde de points insuffisant.' })
        }
        const valueTnd = Math.floor((input.points / redeemRate) * 100) / 100
        if (valueTnd <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Le montant du bon serait nul. Convertissez davantage de points.' })
        }

        // Code unique (retry en cas de collision très rare).
        let code = generateVoucherCode()
        for (let i = 0; i < 5; i++) {
          const clash = await tx.loyaltyVoucher.findUnique({ where: { code } })
          if (!clash) break
          code = generateVoucherCode()
        }
        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
        const newBalance = customer.points - input.points

        const voucher = await tx.loyaltyVoucher.create({
          data: { customerId, code, pointsSpent: input.points, valueTnd, status: 'ACTIVE', expiresAt },
        })
        await tx.customer.update({ where: { id: customerId }, data: { points: newBalance } })
        await tx.pointTransaction.create({
          data: {
            customerId,
            delta: -input.points,
            type: 'REDEEM_VOUCHER',
            reason: `Conversion en bon ${code}`,
            balanceAfter: newBalance,
            voucherId: voucher.id,
          },
        })
        return { code: voucher.code, valueTnd, expiresAt: expiresAt.toISOString(), newBalance }
      })
    }),

  // Nouveaux jeux / campagnes publiés sur Obooking Gift (feed espace client).
  getNewGames: publicProcedure.query(async () => {
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true, isDraft: false },
      orderBy: { startDate: 'desc' },
      take: 12,
      include: {
        partner: { select: { name: true, logoUrl: true } },
        prizes: { select: { name: true } },
      },
    })
    return campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      imageData: c.imageData,
      imageMimeType: c.imageMimeType,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      partnerName: c.partner?.name ?? 'Obooking',
      prizeNames: c.prizes.map((p) => p.name),
    }))
  }),

  // Changement de mot de passe depuis la page "Paramètres" (compte déjà
  // authentifié) — distinct du flux de réinitialisation par email, qui
  // reste nécessaire pour un mot de passe oublié.
  changeMyPassword: customerProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const customer = await prisma.customer.findUnique({ where: { id: ctx.customerSession!.customerId } })
      if (!customer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable.' })
      }
      const isValid = await bcrypt.compare(input.currentPassword, customer.passwordHash)
      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Mot de passe actuel incorrect.' })
      }
      const strengthError = checkPasswordStrength(input.newPassword)
      if (strengthError) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: strengthError })
      }
      const passwordHash = await bcrypt.hash(input.newPassword, 10)
      await prisma.customer.update({ where: { id: customer.id }, data: { passwordHash } })
      return { success: true }
    }),

})

export type AppRouter = typeof appRouter
