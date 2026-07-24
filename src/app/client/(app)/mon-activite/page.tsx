'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { trpc } from '@/utils/trpc'

// Vue d'ensemble combinant l'activité de jeu (Campaign/PlayToken/UserPrize) et
// le résumé achats/points de fidélité (données réelles : LoyaltyPurchase /
// Customer.points / PointTransaction).
export default function MonActivitePage() {
  const { data: activity, isLoading: activityLoading } = trpc.getMyGameActivity.useQuery()
  const { data: purchases, isLoading: purchasesLoading } = trpc.getMyPurchases.useQuery()
  const { data: points, isLoading: pointsLoading } = trpc.getMyLoyaltyPoints.useQuery()

  const stats = [
    { label: 'Participations', value: activityLoading ? '—' : (activity?.participations.length ?? 0).toLocaleString('fr-FR') },
    { label: 'Achats', value: purchasesLoading ? '—' : (purchases?.length ?? 0).toLocaleString('fr-FR') },
    { label: 'Points', value: pointsLoading ? '—' : (points?.balance ?? 0).toLocaleString('fr-FR') },
  ]

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Mon activité</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1.5 max-w-lg">Vue d'ensemble de vos jeux, de vos achats et de vos points merci.</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-sm)] p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)]">{s.label}</div>
            <div className="font-display text-[32px] font-semibold leading-none tabular-nums text-[var(--ink-900)] mt-2.5">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] divide-y divide-black/[0.05] overflow-hidden">
        {[
          { href: '/client/mes-jeux', label: 'Voir mes jeux' },
          { href: '/client/mes-achats', label: 'Voir mes achats' },
          { href: '/client/mes-points', label: 'Voir mes points' },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[var(--surface-alt)] transition-colors group">
            <span className="text-sm font-semibold text-[var(--ink-900)]">{l.label}</span>
            <ArrowRight className="h-4 w-4 text-[var(--ink-500)] group-hover:text-[var(--brand-600)] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
