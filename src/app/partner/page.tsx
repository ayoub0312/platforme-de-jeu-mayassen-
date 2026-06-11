import { prisma } from '@/lib/db'
import { PartnerDashboard } from '@/components/PartnerDashboard'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1A1A1A] flex flex-col justify-between">
      <div className="">
        
        {/* Navigation Bar */}
        <header className="border-b border-[#F0F0F0] bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#FF8C00] transition-all">
                <ArrowLeft className="h-4 w-4" /> Retour au jeu
              </Link>
              <span className="h-4 w-1px bg-slate-200"></span>
              <span className="font-extrabold text-[#1A1A1A] text-lg tracking-tight">
                Portail Analytique Partenaire
              </span>
            </div>
            
            {/* Quick switcher between partners (SUPERADMIN ONLY) */}
            {session && session.role === 'SUPERADMIN' && partners.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs font-semibold">Changer de compte :</span>
                <div className="flex gap-2">
                  {partners.map(p => (
                    <Link
                      key={p.id}
                      href={`/partner?id=${p.id}`}
                      className={`px-3 py-1.5 rounded-lg text-xxs font-bold border transition-all ${
                        p.id === selectedId
                          ? 'bg-[#FF8C00] border-[#FF8C00] text-white shadow-sm shadow-orange-500/10'
                          : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Component */}
        <PartnerDashboard partnerId={selectedId || ''} initialSession={session} />
      </div>

      {/* Footer */}
      <footer className="border-t border-[#F0F0F0] py-8 bg-white/60">
        <div className="max-w-[1600px] mx-auto px-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          Espace sécurisé de partage de leads | Protégé par whitelists CORS dynamiques B2B.
        </div>
      </footer>
    </main>
  )
}
