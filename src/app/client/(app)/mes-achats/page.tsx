'use client'

import { trpc } from '@/utils/trpc'

export default function MesAchatsPage() {
  const { data: purchases, isLoading } = trpc.getMyPurchases.useQuery()

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mes achats</h1>
      <p className="text-sm text-[#1a1a1a]/50 mb-6">Historique de vos achats sur obooking.tn et points gagnés.</p>

      {isLoading ? (
        <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
      ) : purchases && purchases.length > 0 ? (
        <ul className="divide-y divide-black/[0.06] border border-black/[0.08] rounded-xl overflow-hidden">
          {purchases.map((p) => (
            <li key={p.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <div className="text-[#1a1a1a] font-semibold">{p.label}</div>
                <div className="text-[#1a1a1a]/40 text-xs mt-0.5">{new Date(p.purchasedAt).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-[#1a1a1a] font-bold">{p.amount.toLocaleString('fr-FR')} {p.currency}</div>
                {p.pointsEarned > 0 && (
                  <div className="text-[11px] font-bold text-green-600 mt-0.5">+{p.pointsEarned.toLocaleString('fr-FR')} points</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border border-black/[0.08] rounded-xl p-8 text-center">
          <p className="text-sm text-[#1a1a1a]/50">Aucun achat pour le moment.</p>
          <p className="text-xs text-[#1a1a1a]/40 mt-1">Vos achats sur obooking.tn apparaîtront ici et vous rapporteront des points.</p>
        </div>
      )}
    </div>
  )
}
