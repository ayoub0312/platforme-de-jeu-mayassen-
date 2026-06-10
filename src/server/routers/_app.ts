import { z } from 'zod'
import { router, publicProcedure, rateLimitedProcedure, adminProcedure, superAdminProcedure } from '../trpc'
import { prisma } from '../../lib/db'
import { redis } from '../../lib/redis'
import { TRPCError } from '@trpc/server'
import { TokenStatus, EarnMethod, PrizeType, Prize, Role } from '@prisma/client'
import { createSessionToken } from '../../lib/auth'

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
      if (user.email === 'admin@agency.com' && input.password !== 'admin') {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Adresse email ou mot de passe incorrect.',
        })
      }

      if (user.email === 'manager@obooking.com' && input.password !== 'obooking') {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Adresse email ou mot de passe incorrect.',
        })
      }

      // Resolve partnerId for PARTNER role dynamically
      let partnerId: string | null = null
      if (user.role === Role.PARTNER) {
        const domainPart = user.email.split('@')[1] || ''
        const domainPrefix = domainPart.split('.')[0]?.toLowerCase() || ''
        
        const partner = await prisma.partner.findFirst({
          where: {
            OR: [
              { name: { contains: domainPrefix } },
              { allowedDomains: { contains: domainPart } }
            ]
          }
        })
        if (partner) {
          partnerId = partner.id
        } else {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: "Aucun partenaire correspondant trouvé dans la base de données.",
          })
        }
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

  // 1. Get all active campaigns
  getCampaigns: publicProcedure.query(async () => {
    return prisma.campaign.findMany({
      where: { isActive: true },
      include: {
        partner: { select: { name: true } },
        prizes: true,
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

      if (!campaign) {
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
          },
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

        // Referrer must exist and not be the user themselves
        if (referrer && referrer.id !== user.id) {
          // Update player's referredById
          await prisma.user.update({
            where: { id: user.id },
            data: { referredById: referrer.id },
          })

          // Award 2 referral spins to referrer
          await prisma.playToken.createMany({
            data: [
              {
                userId: referrer.id,
                campaignId: input.campaignId,
                earnedVia: EarnMethod.REFERRAL,
                status: TokenStatus.UNUSED,
              },
              {
                userId: referrer.id,
                campaignId: input.campaignId,
                earnedVia: EarnMethod.REFERRAL,
                status: TokenStatus.UNUSED,
              },
            ],
          })
          
          // Clear cached stats for referrer
          console.log(`Referral successfully rewarded for user code ${input.referredByCode}`)
        }
      }

      // Award 3 free starting tokens to the player
      await prisma.playToken.createMany({
        data: Array.from({ length: 3 }).map(() => ({
          userId: user!.id,
          campaignId: input.campaignId,
          earnedVia: EarnMethod.SIGNUP,
          status: TokenStatus.UNUSED,
        })),
      })

      return {
        user,
        tokensCount: 3,
        message: 'Lead registered! 3 spins successfully granted.',
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

      // c. Check if user has an unused spin token for this campaign
      const unusedToken = await prisma.playToken.findFirst({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: TokenStatus.UNUSED,
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
      try {
        await prisma.$transaction([
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

      // Get count of remaining spins
      const remainingSpins = await prisma.playToken.count({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: TokenStatus.UNUSED,
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
        return { tokens: 0, referralCode: '', prizesWon: [], completedTasks: [] }
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
            in: [EarnMethod.VISIT_WEBSITE, EarnMethod.FOLLOW_SOCIAL, EarnMethod.RECEIPT_UPLOAD],
          },
        },
        select: {
          earnedVia: true,
        },
      })
      const completedTasks = Array.from(new Set(completedTokens.map((t) => t.earnedVia)))

      return {
        tokens,
        referralCode: user.referralCode,
        prizesWon: campaignPrizes,
        completedTasks,
      }
    }),

  // Mutation to claim a task's token reward
  claimTaskToken: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        campaignId: z.string(),
        taskType: z.enum(['VISIT_WEBSITE', 'FOLLOW_SOCIAL', 'RECEIPT_UPLOAD']),
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

      // Determine how many tokens to award
      const tokensCount = input.taskType === 'RECEIPT_UPLOAD' ? 5 : 1

      // Create the play tokens
      await prisma.playToken.createMany({
        data: Array.from({ length: tokensCount }).map(() => ({
          userId: user.id,
          campaignId: input.campaignId,
          earnedVia: input.taskType as EarnMethod,
          status: TokenStatus.UNUSED,
        })),
      })

      // Get updated total unused spins count
      const totalUnusedSpins = await prisma.playToken.count({
        where: {
          userId: user.id,
          campaignId: input.campaignId,
          status: TokenStatus.UNUSED,
        },
      })

      return {
        success: true,
        tokensAwarded: tokensCount,
        totalTokens: totalUnusedSpins,
        message: `Félicitations ! Vous avez obtenu +${tokensCount} lancers.`,
      }
    }),

  // Partners CRUD
  getPartners: superAdminProcedure.query(async () => {
    return prisma.partner.findMany({
      orderBy: { name: 'asc' }
    })
  }),

  createPartner: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        allowedDomains: z.string().default(''),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.partner.create({
        data: {
          name: input.name,
          allowedDomains: input.allowedDomains,
        },
      })
    }),

  updatePartner: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        allowedDomains: z.string().default(''),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.partner.update({
        where: { id: input.id },
        data: {
          name: input.name,
          allowedDomains: input.allowedDomains,
        },
      })
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

  // Campaigns CRUD
  getAllCampaigns: superAdminProcedure.query(async () => {
    return prisma.campaign.findMany({
      include: {
        partner: { select: { name: true, id: true } },
      },
      orderBy: { startDate: 'desc' },
    })
  }),

  createCampaign: superAdminProcedure
    .input(
      z.object({
        partnerId: z.string().nullable().optional(),
        title: z.string().min(2, 'Title must be at least 2 characters'),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        isActive: z.boolean().default(true),
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
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: input.isActive,
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
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        isActive: z.boolean(),
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
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: input.isActive,
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

  // Prizes CRUD
  getAllPrizes: superAdminProcedure.query(async () => {
    return prisma.prize.findMany({
      include: {
        campaign: { select: { title: true, id: true } },
      },
      orderBy: { name: 'asc' },
    })
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

  // Users & Tokens CRUD
  getAllUsers: superAdminProcedure.query(async () => {
    const users = await prisma.user.findMany({
      include: {
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
        tokensByCampaign,
        wonPrizesCount: user.wonPrizes.length,
        wonPrizes: user.wonPrizes.map((wp) => wp.prize.name),
      }
    })
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
})

export type AppRouter = typeof appRouter
