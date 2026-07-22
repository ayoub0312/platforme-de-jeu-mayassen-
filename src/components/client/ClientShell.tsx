'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { trpc } from '@/utils/trpc'

const NAV_ITEMS = [
  { href: '/client/mes-informations', label: 'Mes informations' },
  { href: '/client/mes-jeux', label: 'Mes jeux' },
  { href: '/client/mon-activite', label: 'Mon activité' },
  { href: '/client/mes-achats', label: 'Mes achats' },
  { href: '/client/mes-points', label: 'Mes points' },
  { href: '/client/mes-bons', label: 'Mes bons' },
  { href: '/client/parametres', label: 'Paramètres' },
]

// Palier purement présentationnel, dérivé du solde de points déjà chargé —
// aucune logique métier, juste un habillage "programme de fidélité" pour le
// concept "Mon Passeport Obooking". À ajuster librement, ça ne touche à rien
// côté serveur.
function getTravelerTier(points: number): string {
  if (points >= 2000) return 'Globe-trotteur'
  if (points >= 500) return 'Aventurier'
  return 'Explorateur'
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const logoutMut = trpc.logoutCustomer.useMutation()
  const { data: profile, isLoading: profileLoading } = trpc.getMyProfile.useQuery()
  const { data: points } = trpc.getMyLoyaltyPoints.useQuery()

  const handleLogout = async () => {
    try {
      await logoutMut.mutateAsync()
    } finally {
      document.cookie = 'customer_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict'
      router.push('/client/login')
      router.refresh()
    }
  }

  const displayName = profile?.name?.trim() || profile?.email?.split('@')[0] || 'Client'
  const initial = displayName.charAt(0).toUpperCase()
  const tier = getTravelerTier(points?.balance ?? 0)

  return (
    <div
      className="relative z-10 h-screen overflow-y-auto bg-[#F7F7F4] text-[#1a1a1a] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#FF6B47]/35 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#FF6B47]/55"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,107,71,0.4) transparent' }}
    >
      {/* Couche décorative de l'espace client : glows Corail/Lagon, lignes de
          vol pointillées, grain premium. Purement visuel (pointer-events-none),
          fixe par rapport au viewport — le contenu réel (header/main) est en
          relative z-10 pour rester au-dessus, même leçon que le bug WaveBackground. */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #FF6B47 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #0EA5A0 0%, transparent 70%)' }}
        />
        {/* Lignes de vol — trajectoires pointillées façon carte de voyage */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 38px, #0EA5A0 38px, #0EA5A0 39px)',
          }}
        />
        <div className="absolute inset-0 bg-grain-texture" />
      </div>

      {/* Liseré "couverture de passeport" : Corail → Lagon, avec un fin sweep lumineux animé */}
      <div className="relative h-1.5 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B47] via-[#ffb27a] to-[#0EA5A0]" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        />
      </div>

      <header className="sticky top-0 z-20 bg-white/75 backdrop-blur-xl border-b border-black/[0.06]" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 12px 24px -16px rgba(0,0,0,0.12)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {profileLoading ? (
              <>
                <div className="h-11 w-11 rounded-full skeleton-shimmer shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 rounded skeleton-shimmer" />
                  <div className="h-3 w-20 rounded skeleton-shimmer" />
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 min-w-0"
              >
                <div className="relative shrink-0">
                  <motion.div
                    className="absolute -inset-1 rounded-full bg-[#FF6B47]/25 blur-md"
                    animate={{ opacity: [0.5, 0.9, 0.5] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  />
                  <div
                    className="relative h-11 w-11 rounded-full bg-[#FF6B47] ring-2 ring-[#FF6B47]/40 ring-offset-2 ring-offset-white flex items-center justify-center text-white font-display font-semibold text-lg shadow-[var(--shadow-premium-sm)]"
                    aria-hidden="true"
                  >
                    {initial}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1a1a1a] truncate">{displayName}</p>
                  <span className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full overflow-hidden text-[10px] font-bold uppercase tracking-wide text-white bg-gradient-to-r from-[#FF6B47] to-[#0EA5A0]">
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                      aria-hidden="true"
                    />
                    <span className="relative">{tier}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Se déconnecter"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Se déconnecter</span>
          </button>
        </div>

        <nav
          className="max-w-4xl mx-auto px-6 flex gap-6 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
          aria-label="Navigation de l'espace client"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative text-sm py-3 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B47] focus-visible:ring-offset-2 rounded-sm ${
                  isActive ? 'text-[#1a1a1a] font-semibold' : 'text-[#1a1a1a]/50 hover:text-[#1a1a1a]'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="client-tab-underline"
                    className="absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-gradient-to-r from-[#FF6B47] to-[#0EA5A0]"
                    style={{ boxShadow: '0 1px 8px rgba(255,107,71,0.45)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
