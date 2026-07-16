'use client'

import { trpc } from '@/utils/trpc'
import { DemoBanner } from '@/components/client/DemoBanner'

export default function MesPointsPage() {
  const { data: points, isLoading } = trpc.getMyLoyaltyPoints.useQuery()

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mes points</h1>
      <p className="text-sm text-[#1a1a1a]/50 mb-6">Points de fidélité obooking.tn.</p>

      <DemoBanner />

      {isLoading ? (
        <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
      ) : (
        <div className="border border-black/[0.08] rounded-md p-6">
          <div className="text-3xl font-mono font-semibold text-[#1a1a1a]">{points?.balance ?? 0}</div>
          <div className="text-xs text-[#1a1a1a]/40 mt-1">
            points · mis à jour le {points ? new Date(points.updatedAt).toLocaleDateString('fr-FR') : '—'}
          </div>
        </div>
      )}
    </div>
  )
}
