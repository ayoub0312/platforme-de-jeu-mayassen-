import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { PartnerDashboard } from '@/components/PartnerDashboard'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Back-office privé — jamais indexé par les moteurs de recherche.
export const metadata: Metadata = {
  title: 'Espace Partenaire | Obooking Gift',
  robots: { index: false, follow: false },
}

interface PartnerPageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function PartnerPage({ searchParams }: PartnerPageProps) {
  const resolvedParams = await searchParams
  let selectedId = resolvedParams.id

  // 1. Verify user session
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value
  const session = await verifySessionToken(token)

  // 2. Fetch B2B Partners from Database
  const partners = await prisma.partner.findMany({
    select: { id: true, name: true }
  })

  // 3. Apply role restrictions on selectedId
  if (session) {
    if (session.role === 'PARTNER') {
      selectedId = session.partnerId || undefined
    } else if (!selectedId && partners.length > 0) {
      selectedId = partners[0].id
    }
  }

  // AdminLayout (rendered inside PartnerDashboard once authenticated) provides
  // the full page chrome — sidebar, topbar, breadcrumb — so this route has no
  // header/footer of its own.
  return <PartnerDashboard partnerId={selectedId || ''} initialSession={session} allPartnersForSwitcher={partners} />
}
