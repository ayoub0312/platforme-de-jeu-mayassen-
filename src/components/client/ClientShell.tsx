'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

const NAV_ITEMS = [
  { href: '/client/mes-informations', label: 'Mes informations' },
  { href: '/client/mes-jeux', label: 'Mes jeux' },
  { href: '/client/mon-activite', label: 'Mon activité' },
  { href: '/client/mes-achats', label: 'Mes achats' },
  { href: '/client/mes-points', label: 'Mes points' },
  { href: '/client/parametres', label: 'Paramètres' },
]

// Esprit Notion : beaucoup de blanc, hiérarchie typographique nette,
// couleur en accent ponctuel uniquement (lien actif). Voir ESPACE_CLIENT.md
// pour la tension entre cette sobriété et l'identité colorée du reste du site.
export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const logoutMut = trpc.logoutCustomer.useMutation()

  const handleLogout = async () => {
    try {
      await logoutMut.mutateAsync()
    } finally {
      document.cookie = 'customer_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict'
      router.push('/client/login')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <header className="border-b border-black/[0.08]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/client/mes-informations" className="font-semibold tracking-tight text-sm">
            Obooking Gift <span className="text-[#1a1a1a]/40 font-normal">· Espace client</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors cursor-pointer"
          >
            Se déconnecter
          </button>
        </div>
        <nav className="max-w-4xl mx-auto px-6 flex gap-6 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm py-3 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-[#FF6B47] text-[#1a1a1a] font-medium'
                    : 'border-transparent text-[#1a1a1a]/50 hover:text-[#1a1a1a]'
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
