import "dotenv/config"
import { PrismaClient, Role, PrizeType, TokenStatus, EarnMethod } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN
const useRemote = !!(tursoUrl && tursoUrl.trim() !== '' && tursoToken && tursoToken.trim() !== '')

const adapter = new PrismaLibSql({
  url: useRemote ? tursoUrl! : (process.env.DATABASE_URL || "file:./dev.db"),
  authToken: useRemote ? tursoToken : undefined,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seeding for Supermarket theme...')

  // 1. Clean up existing data
  console.log('Cleaning up existing database records...')
  await prisma.leadCapture.deleteMany({})
  await prisma.playToken.deleteMany({})
  await prisma.userPrize.deleteMany({})
  await prisma.prize.deleteMany({})
  await prisma.campaign.deleteMany({})
  await prisma.partner.deleteMany({})
  await prisma.user.deleteMany({})

  // 2. Create Users
  console.log('Creating users...')
  const superadmin = await prisma.user.create({
    data: {
      email: 'admin@agency.com',
      name: 'Agency Super Admin',
      role: Role.SUPERADMIN,
      referralCode: 'admin-ref-code',
    },
  })

  const partnerUser = await prisma.user.create({
    data: {
      email: 'manager@obooking.com',
      name: 'Obooking Campaign Manager',
      role: Role.PARTNER,
      referralCode: 'obooking-ref-code',
    },
  })

  const player1 = await prisma.user.create({
    data: {
      email: 'alex.player@gmail.com',
      name: 'Alex Johnson',
      role: Role.PLAYER,
      referralCode: 'alex-ref-code',
    },
  })

  const player2 = await prisma.user.create({
    data: {
      email: 'sarah.smith@gmail.com',
      name: 'Sarah Smith',
      role: Role.PLAYER,
      referralCode: 'sarah-ref',
      referredById: player1.id,
    },
  })

  console.log(`Created users: Admin (${superadmin.email}), Partner (${partnerUser.email}), Players (${player1.email}, ${player2.email})`)

  // 3. Create Partners
  console.log('Creating B2B partners...')
  const partner1 = await prisma.partner.create({
    data: {
      name: 'obooking',
      allowedDomains: 'localhost:3000,obooking.com,play.obooking.com',
    },
  })

  const partner2 = await prisma.partner.create({
    data: {
      name: 'tout est la',
      allowedDomains: 'localhost:3000,toutestla.com,play.toutestla.com',
    },
  })

  console.log(`Created partners: ${partner1.name}, ${partner2.name}`)

  // 4. Create Campaigns
  console.log('Creating campaigns...')
  const now = new Date()
  const oneMonthFromNow = new Date()
  oneMonthFromNow.setMonth(now.getMonth() + 1)

  const campaign1 = await prisma.campaign.create({
    data: {
      partnerId: partner1.id,
      title: '🎰 Le Grand Jeu Roulette Obooking',
      startDate: now,
      endDate: oneMonthFromNow,
      isActive: true,
    },
  })

  const campaign2 = await prisma.campaign.create({
    data: {
      partnerId: partner2.id,
      title: '🎰 Le Grand Jeu Roulette Tout est la',
      startDate: now,
      endDate: oneMonthFromNow,
      isActive: true,
    },
  })

  console.log(`Created campaigns: ${campaign1.title}, ${campaign2.title}`)

  // 5. Create Prizes & Consolation Fallbacks
  console.log('Creating prizes...')

  // -- Obooking Consolation Prize First --
  const obookingConsolation = await prisma.prize.create({
    data: {
      campaignId: campaign1.id,
      name: '🎁 Bon d\'achat Obooking de 5TND',
      type: PrizeType.DIGITAL,
      totalStock: -1, // Unlimited
      remainingStock: -1,
      winProbability: 0.75,
    },
  })

  // Obooking Main Prizes
  const obookingPrize1 = await prisma.prize.create({
    data: {
      campaignId: campaign1.id,
      name: '✈️ Voyage de Rêve d\'une Valeur de 1500TND',
      type: PrizeType.PHYSICAL,
      totalStock: 1,
      remainingStock: 1,
      winProbability: 0.005,
      fallbackPrizeId: obookingConsolation.id,
    },
  })

  const obookingPrize2 = await prisma.prize.create({
    data: {
      campaignId: campaign1.id,
      name: '🛒 1 An de Voyages Gratuits',
      type: PrizeType.PHYSICAL,
      totalStock: 3,
      remainingStock: 3,
      winProbability: 0.045,
      fallbackPrizeId: obookingConsolation.id,
    },
  })

  const obookingPrize3 = await prisma.prize.create({
    data: {
      campaignId: campaign1.id,
      name: '🎁 Bon d\'Achat Obooking de 20TND',
      type: PrizeType.DIGITAL,
      totalStock: 50,
      remainingStock: 50,
      winProbability: 0.2,
      fallbackPrizeId: obookingConsolation.id,
    },
  })

  // -- Tout est la Consolation Prize First --
  const toutEstLaConsolation = await prisma.prize.create({
    data: {
      campaignId: campaign2.id,
      name: '🎁 Bon d\'achat Tout est la de 10TND',
      type: PrizeType.DIGITAL,
      totalStock: -1, // Unlimited
      remainingStock: -1,
      winProbability: 0.75,
    },
  })

  // Tout est la Main Prizes
  const toutEstLaPrize1 = await prisma.prize.create({
    data: {
      campaignId: campaign2.id,
      name: '✈️ Voyage de Rêve aux Maldives (Valeur 2500TND)',
      type: PrizeType.PHYSICAL,
      totalStock: 1,
      remainingStock: 1,
      winProbability: 0.005,
      fallbackPrizeId: toutEstLaConsolation.id,
    },
  })

  const toutEstLaPrize2 = await prisma.prize.create({
    data: {
      campaignId: campaign2.id,
      name: '🛒 Chariot de Courses Gratuit (Valeur 200TND)',
      type: PrizeType.PHYSICAL,
      totalStock: 5,
      remainingStock: 5,
      winProbability: 0.045,
      fallbackPrizeId: toutEstLaConsolation.id,
    },
  })

  const toutEstLaPrize3 = await prisma.prize.create({
    data: {
      campaignId: campaign2.id,
      name: '🎁 Bon d\'Achat Tout est la de 50TND',
      type: PrizeType.DIGITAL,
      totalStock: 20,
      remainingStock: 20,
      winProbability: 0.2,
      fallbackPrizeId: toutEstLaConsolation.id,
    },
  })

  console.log('Created all prize tiers and fallback relationships successfully!')

  // 6. Give Play Tokens to Players
  console.log('Generating play tokens for testing...')
  for (let i = 0; i < 5; i++) {
    await prisma.playToken.create({
      data: {
        userId: player1.id,
        campaignId: campaign1.id,
        status: TokenStatus.UNUSED,
        earnedVia: EarnMethod.SIGNUP,
      },
    })
  }

  for (let i = 0; i < 2; i++) {
    await prisma.playToken.create({
      data: {
        userId: player2.id,
        campaignId: campaign2.id,
        status: TokenStatus.UNUSED,
        earnedVia: EarnMethod.REFERRAL,
      },
    })
  }

  console.log('Seeded play tokens.')
  console.log('🎉 Database seeding successfully completed!')
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
