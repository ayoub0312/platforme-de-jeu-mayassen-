import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { CampaignPortal } from '@/components/CampaignPortal'

// Force server-side rendering for real-time campaign states
export const dynamic = 'force-dynamic'

export default async function Home() {
  // Fetch active campaigns including B2B partner and prizes on the server
  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true },
    include: {
      partner: { select: { name: true } },
      prizes: true,
    },
    orderBy: { startDate: 'desc' },
  })

  // Format Date objects and pre-merge prize stock status from Redis cache
  const serializedCampaigns = await Promise.all(
    campaigns.map(async (campaign) => {
      const serializedPrizes = await Promise.all(
        campaign.prizes.map(async (prize) => {
          if (prize.totalStock === -1) {
            return prize
          }
          // Fetch real-time cached stocks from Redis
          const cachedStock = await redis.hget<number>('prize:stocks', prize.id)
          return {
            ...prize,
            remainingStock: cachedStock !== null ? cachedStock : prize.remainingStock,
          }
        })
      )

      return {
        ...campaign,
        startDate: campaign.startDate.toISOString(),
        endDate: campaign.endDate.toISOString(),
        prizes: serializedPrizes,
      }
    })
  )

  return (
    <main className="min-h-screen bg-gradient-to-tr from-[#FFF5EC] via-white to-[#FAFAFA] text-[#1A1A1A] flex flex-col justify-between">
      <div className="flex-grow">
        {/* Navigation Bar */}
        <header className="border-b border-[#F0F0F0] bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              
              <span className="font-extrabold text-[#1A1A1A] text-lg tracking-tight">
                Obooking Game
              </span>
            </div>
            
          </div>
        </header>

        {/* Client side dashboard */}
        <CampaignPortal initialCampaigns={serializedCampaigns} />
      </div>

      {/* Footer */}
      <footer className="border-t border-[#F0F0F0] py-8 bg-white/60">
        {/* <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          Powered by Next.js App Router, Hono Edge, tRPC v11, Prisma & Turso libSQL Database, and Upstash Redis.
        </div> */}
      </footer>
    </main>
  )
}
