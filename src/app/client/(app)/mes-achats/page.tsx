'use client'

import { trpc } from '@/utils/trpc'
import { DemoBanner } from '@/components/client/DemoBanner'

export default function MesAchatsPage() {
  const { data: purchases, isLoading } = trpc.getMyPurchases.useQuery()

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mes achats</h1>
      <p className="text-sm text-[#1a1a1a]/50 mb-6">Historique de vos achats sur obooking.tn.</p>

      <DemoBanner />

      {isLoading ? (
        <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
      ) : purchases && purchases.length > 0 ? (
        <ul className="divide-y divide-black/[0.06] border-t border-b border-black/[0.06]">
          {purchases.map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <div className="text-[#1a1a1a]">{p.label}</div>
                <div className="text-[#1a1a1a]/40 text-xs font-mono">{new Date(p.purchasedAt).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className="font-mono text-sm text-[#1a1a1a]">{p.amount} {p.currency}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#1a1a1a]/40">Aucun achat.</p>
      )}
    </div>
  )
}
