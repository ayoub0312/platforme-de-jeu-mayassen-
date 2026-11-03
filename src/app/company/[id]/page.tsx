import { cache } from 'react'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { CampaignPortal } from '@/components/CampaignPortal'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface CompanyPageProps {
  params: Promise<{ id: string }>
}

// cache() dedupes this lookup between generateMetadata and the page render —
// both run for every request but React collapses them into a single query.
const getPartnerBySlug = cache((rawId: string) => {
  const id = decodeURIComponent(rawId)
  return prisma.partner.findFirst({
    where: {
      OR: [
        { id },
        { slug: id.toLowerCase() },
        // Anciens liens construits depuis le nom (avant l'ajout de Partner.slug).
        { name: { equals: id.toLowerCase().replace(/-/g, ' ') } },
      ],
    },
  })
})

export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { id } = await params
  const partner = await getPartnerBySlug(id)
  if (!partner) {
    return { title: 'Partenaire introuvable | Obooking Gift' }
  }
  return {
    title: `${partner.name} | Obooking Gift`,
    description: `Jouez et tentez de remporter des lots exclusifs offerts par ${partner.name} avec Obooking Gift.`,
    openGraph: {
      title: `${partner.name} | Obooking Gift`,
      description: `Jouez et tentez de remporter des lots exclusifs offerts par ${partner.name}.`,
    },
  }
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // 1. Resolve B2B Partner by ID or Name slug
  const partner = await getPartnerBySlug(id)

  if (!partner) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-paper">
        <div className="w-full max-w-md">
          <p className="text-[13px] font-medium text-ink-500">Lien introuvable</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">Ce jeu n&apos;existe pas ou plus</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
            Le lien est peut-être incomplet, ou le partenaire n&apos;a plus de jeu en ligne.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center gap-2 px-4 btn-game text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voir les jeux en cours
          </Link>
        </div>
      </main>
    )
  }

  // 2. Fetch campaigns associated with this partner
  const campaigns = await prisma.campaign.findMany({
    where: {
      partnerId: partner.id,
      isActive: true,
      isDraft: false,
    },
    include: {
      partner: { select: { name: true } },
      // Must match the ordering spinRoulette uses to compute prizeIndex,
      // otherwise the wheel visually lands on a different prize than the one awarded.
      prizes: { orderBy: { winProbability: 'asc' } },
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

  return (
    <main className="min-h-screen flex flex-col bg-paper text-ink-900">
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {partner.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain border border-rule bg-surface" />
            ) : (
              <span className="h-8 w-8 rounded-lg bg-paper-2 border border-rule flex items-center justify-center text-[13px] font-semibold text-ink-700 shrink-0" aria-hidden="true">
                {partner.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-[15px] font-semibold tracking-tight truncate">{partner.name}</span>
          </div>
          <Link href="/" className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors whitespace-nowrap">
            Tous les jeux Obooking
          </Link>
        </div>
      </header>

      <div className="flex-1">
        <CampaignPortal
          initialCampaigns={serializedCampaigns}
          partnerId={partner.id}
          partnerName={partner.name}
        />
      </div>

      <footer className="border-t border-rule pb-24 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-[13px] text-ink-500">
          Jeu-concours propulsé par Obooking Gift · © {new Date().getFullYear()}
        </div>
      </footer>
    </main>
  )
}
