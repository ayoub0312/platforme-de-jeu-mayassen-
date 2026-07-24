import { prisma } from '@/lib/db'
import { AggregatorPortal } from '@/components/AggregatorPortal'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // 1. Verify user session
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value
  const session = await verifySessionToken(token)

  // 2. Query all active campaigns with their prizes and partner metadata
  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true },
    include: {
      partner: true,
      prizes: true,
    },
    orderBy: { startDate: 'desc' },
  })

  // 2b. Homepage hero video/poster + promo banners (site-wide, admin-managed)
  // On ne charge PAS heroVideoData (base64 ~22 Mo) ici : la vidéo est servie
  // via /api/media/hero-video (cache navigateur). On lit juste le type MIME
  // (petit) pour savoir s'il y a une vidéo.
  const siteSettings = await prisma.siteSettings.findUnique({
    where: { id: 'main' },
    select: { heroVideoMimeType: true },
  })
  const promoBanners = await prisma.promoBanner.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })

  // 3. Serialize Date objects to ISO strings for safety inside client components
  const serializedCampaigns = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate.toISOString(),
    partnerId: campaign.partnerId,
    gameMode: campaign.gameMode,
    imageData: campaign.imageData,
    imageMimeType: campaign.imageMimeType,
    partner: campaign.partner 
      ? {
          id: campaign.partner.id,
          name: campaign.partner.name,
        }
      : null,
    prizes: campaign.prizes.map((prize) => ({
      id: prize.id,
      name: prize.name,
      type: prize.type,
      totalStock: prize.totalStock,
      remainingStock: prize.remainingStock,
      drawDate: prize.drawDate ? prize.drawDate.toISOString() : null,
    })),
  }))

  return (
    <AggregatorPortal
      initialCampaigns={serializedCampaigns}
      isAdminConnected={!!session}
      siteSettings={{
        hasHeroVideo: !!siteSettings?.heroVideoMimeType,
        heroVideoMimeType: siteSettings?.heroVideoMimeType ?? null,
      }}
      promoBanners={promoBanners.map((b) => ({
        id: b.id,
        imageData: b.imageData,
        imageMimeType: b.imageMimeType,
        linkUrl: b.linkUrl,
      }))}
    />
  )
}
