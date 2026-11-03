'use client'

import { ShoppingBag } from 'lucide-react'
import { trpc } from '@/utils/trpc'

export default function MesAchatsPage() {
  const { data: purchases, isLoading } = trpc.getMyPurchases.useQuery()

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Mes achats</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1.5 max-w-lg">
          Historique de vos achats sur obooking.tn et des points merci qu'ils vous ont rapportés.
        </p>
      </header>

      {isLoading ? (
        <div className="h-40 rounded-2xl skeleton-shimmer" />
      ) : purchases && purchases.length > 0 ? (
        <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] divide-y divide-black/[0.05] overflow-hidden">
          {purchases.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--ink-900)] truncate">{p.label}</div>
                <div className="text-[12px] text-[var(--ink-500)] mt-0.5">{new Date(p.purchasedAt).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-[var(--ink-900)] tabular-nums">{p.amount.toLocaleString('fr-FR')} {p.currency}</div>
                {p.pointsEarned > 0 && (
                  <div className="text-[12px] font-bold text-[var(--success)] mt-0.5 tabular-nums">+{p.pointsEarned.toLocaleString('fr-FR')} points</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.1] py-10 px-6 text-center">
          <div className="h-11 w-11 rounded-xl bg-[var(--surface-alt)] flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="h-5 w-5 text-[var(--ink-500)]" />
          </div>
          <p className="text-sm text-[var(--ink-500)]">Aucun achat pour le moment.</p>
          <p className="text-[12px] text-[var(--ink-500)]/80 mt-1">Vos achats sur obooking.tn apparaîtront ici et vous rapporteront des points.</p>
        </div>
      )}
    </div>
  )
}
