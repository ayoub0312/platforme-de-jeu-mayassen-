'use client'

import Link from 'next/link'
import { trpc } from '@/utils/trpc'

// Vue d'ensemble combinant l'activité de jeu (Campaign/PlayToken/UserPrize) et
// le résumé achats/points de fidélité (données réelles : LoyaltyPurchase /
// Customer.points / PointTransaction).
export default function MonActivitePage() {
  const { data: activity, isLoading: activityLoading } = trpc.getMyGameActivity.useQuery()
  const { data: purchases, isLoading: purchasesLoading } = trpc.getMyPurchases.useQuery()
  const { data: points, isLoading: pointsLoading } = trpc.getMyLoyaltyPoints.useQuery()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mon activité</h1>
        <p className="text-sm text-[#1a1a1a]/50">Vue d'ensemble de vos jeux, achats et points.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-black/[0.08] rounded-md p-4">
          <div className="text-2xl font-mono font-semibold text-[#1a1a1a]">
            {activityLoading ? '—' : activity?.participations.length ?? 0}
          </div>
          <div className="text-xs text-[#1a1a1a]/40 mt-1">Participations</div>
        </div>
        <div className="border border-black/[0.08] rounded-md p-4">
          <div className="text-2xl font-mono font-semibold text-[#1a1a1a]">
            {purchasesLoading ? '—' : purchases?.length ?? 0}
          </div>
          <div className="text-xs text-[#1a1a1a]/40 mt-1">Achats</div>
        </div>
        <div className="border border-black/[0.08] rounded-md p-4">
          <div className="text-2xl font-mono font-semibold text-[#1a1a1a]">
            {pointsLoading ? '—' : points?.balance ?? 0}
          </div>
          <div className="text-xs text-[#1a1a1a]/40 mt-1">Points</div>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <Link href="/client/mes-jeux" className="text-[#FF6B47] hover:underline font-medium">Voir mes jeux →</Link>
        <Link href="/client/mes-achats" className="text-[#FF6B47] hover:underline font-medium">Voir mes achats →</Link>
        <Link href="/client/mes-points" className="text-[#FF6B47] hover:underline font-medium">Voir mes points →</Link>
      </div>
    </div>
  )
}
