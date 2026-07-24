'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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

// Palier de fidélité dérivé du solde — habillage "programme", aucune logique
// métier côté serveur.
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
    <div className="min-h-screen bg-[var(--surface-alt)] text-[var(--ink-900)]">
      {/* Fin liseré de marque, statique et sobre */}
      <div className="h-[3px] bg-[var(--brand-500)]" aria-hidden="true" />

      <header className="sticky top-0 z-20 bg-[var(--surface)]/85 backdrop-blur-md border-b border-black/[0.07]">
        <div className="max-w-4xl mx-auto px-6 pt-5 pb-0 flex items-center justify-between gap-4">
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
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="shrink-0 h-11 w-11 rounded-full bg-[var(--brand-500)] flex items-center justify-center text-white font-display font-semibold text-lg"
                  aria-hidden="true"
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-tight truncate">{displayName}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--brand-700)] bg-[var(--brand-50)] border border-[var(--brand-500)]/15">
                    {tier}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Se déconnecter"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Se déconnecter</span>
          </button>
        </div>

        <nav
          className="max-w-4xl mx-auto px-6 mt-4 flex gap-7 overflow-x-auto"
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
                className={`relative text-sm py-3 whitespace-nowrap border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 rounded-t-sm ${
                  isActive
                    ? 'text-[var(--ink-900)] font-semibold border-[var(--brand-500)]'
                    : 'text-[var(--ink-500)] font-medium border-transparent hover:text-[var(--ink-900)] hover:border-black/10'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
