import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { CampaignPortal } from '@/components/CampaignPortal'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface CompanyPageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // 1. Resolve B2B Partner by ID or Name slug
  const partner = await prisma.partner.findFirst({
    where: {
      OR: [
        { id: id },
        { name: { equals: id.toLowerCase().replace(/-/g, ' ') } }
      ]
    }
  })

  if (!partner) {
    return (
      <main className="min-h-screen bg-linear-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] text-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)]  pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-orange-500 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 bg-white border border-slate-200/80 rounded-[32px] p-8 max-w-md w-full shadow-xl text-center">
          <AlertTriangle className="h-12 w-12 text-[#FF8C00] mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-black text-slate-800">Partenaire Introuvable</h2>
          <p className="text-slate-550 text-xs mt-2 leading-relaxed">
            Le lien de jeu auquel vous tentez d'accéder n'est pas valide ou l'entreprise n'est pas encore enregistrée.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-orange-500/10 active:scale-98"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </main>
    )
  }

  // 2. Fetch campaigns associated with this partner
  const campaigns = await prisma.campaign.findMany({
    where: {
      partnerId: partner.id,
      isActive: true
    },
    include: {
      partner: { select: { name: true } },
      prizes: true,
    },
    orderBy: { startDate: 'desc' },
  })

  // 3. Serialize and pre-merge Redis stocks
  const serializedCampaigns = await Promise.all(
    campaigns.map(async (campaign) => {
      const serializedPrizes = await Promise.all(
        campaign.prizes.map(async (prize) => {
          if (prize.totalStock === -1) {
            return prize
          }
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

  const isToutEstLa = partner.name.toLowerCase().includes('tout est la') || partner.name.toLowerCase().includes('tout')

  return (
    <main className="b2b-white-portal min-h-screen bg-linear-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] text-slate-900 relative overflow-hidden flex flex-col justify-between">
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)]  pointer-events-none" />

      {/* Dynamic Ambient Blur Lights */}
      <div className="absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none transition-all duration-1000" />

      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px]  rounded-full blur-[140px] pointer-events-none" />

      <div className="z-10">
        {/* Client side dashboard with filtered campaigns */}
        <CampaignPortal
          initialCampaigns={serializedCampaigns}
          partnerId={partner.id}
          partnerName={partner.name}
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-6 bg-white/60 backdrop-blur-md text-slate-500 text-xs text-center z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-semibold">
          Jeu concours sécurisé propulsé par Obooking &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </main>
  )
}
