'use client'

import { trpc } from '@/utils/trpc'

export default function MesJeuxPage() {
  const { data: campaigns, isLoading: campaignsLoading } = trpc.getCampaigns.useQuery(undefined)
  const { data: activity, isLoading: activityLoading } = trpc.getMyGameActivity.useQuery()

  return (
    <div className="max-w-2xl space-y-12">
      <div>
        <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mes jeux</h1>
        <p className="text-sm text-[#1a1a1a]/50">Vos participations et campagnes accessibles.</p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-[#1a1a1a] mb-4">Lots gagnés</h2>
        {activityLoading ? (
          <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
        ) : activity && activity.prizesWon.length > 0 ? (
          <ul className="divide-y divide-black/[0.06] border-t border-b border-black/[0.06]">
            {activity.prizesWon.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="text-[#1a1a1a]">{p.prizeName}</div>
                  <div className="text-[#1a1a1a]/40 text-xs">{p.campaignTitle}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-[#1a1a1a]/50">{p.status}</div>
                  <div className="text-[11px] font-mono text-[#1a1a1a]/30">{new Date(p.claimedAt).toLocaleDateString('fr-FR')}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#1a1a1a]/40">Aucun lot gagné pour l'instant.</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#1a1a1a] mb-4">Mes participations</h2>
        {activityLoading ? (
          <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
        ) : activity && activity.participations.length > 0 ? (
          <ul className="divide-y divide-black/[0.06] border-t border-b border-black/[0.06]">
            {activity.participations.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="text-[#1a1a1a]">{p.campaignTitle}</div>
                  <div className="text-[#1a1a1a]/40 text-xs">{p.gameMode === 'ROULETTE' ? 'Roulette' : 'Tirage au sort'}</div>
                </div>
                <div className="text-xs font-mono text-[#1a1a1a]/50">{p.status}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#1a1a1a]/40">Aucune participation pour l'instant — inscrivez-vous à une campagne active depuis le site pour commencer à jouer.</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#1a1a1a] mb-4">Campagnes actives</h2>
        {campaignsLoading ? (
          <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
        ) : campaigns && campaigns.length > 0 ? (
          <ul className="divide-y divide-black/[0.06] border-t border-b border-black/[0.06]">
            {campaigns.map((c: any) => (
              <li key={c.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="text-[#1a1a1a]">{c.title}</div>
                  <div className="text-[#1a1a1a]/40 text-xs">{c.partner?.name}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#1a1a1a]/40">Aucune campagne active actuellement.</p>
        )}
      </section>
    </div>
  )
}
