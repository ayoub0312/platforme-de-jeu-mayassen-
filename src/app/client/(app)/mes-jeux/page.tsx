'use client'

import { trpc } from '@/utils/trpc'

export default function MesJeuxPage() {
  const { data: newGames, isLoading: newGamesLoading } = trpc.getNewGames.useQuery()
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
        <h2 className="text-sm font-medium text-[#1a1a1a] mb-4">Nouveaux jeux Obooking Gift</h2>
        {newGamesLoading ? (
          <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
        ) : newGames && newGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {newGames.map((c) => (
              <div key={c.id} className="border border-black/[0.08] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                {c.imageData && c.imageMimeType ? (
                  <img src={`data:${c.imageMimeType};base64,${c.imageData}`} alt={c.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-[#FF6B47] to-[#E85530]" />
                )}
                <div className="p-4">
                  <div className="text-sm font-bold text-[#1a1a1a]">{c.title}</div>
                  <div className="text-[11px] text-[#1a1a1a]/40 mt-0.5">{c.partnerName}</div>
                  {c.description && <p className="text-xs text-[#1a1a1a]/60 mt-2 line-clamp-2">{c.description}</p>}
                  {c.prizeNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.prizeNames.slice(0, 3).map((name, i) => (
                        <span key={i} className="text-[10px] font-bold bg-[#FF6B47]/10 text-[#FF6B47] border border-[#FF6B47]/20 rounded-full px-2 py-0.5">{name}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-[#1a1a1a]/40 mt-2">
                    Jusqu'au {new Date(c.endDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#1a1a1a]/40">Aucun nouveau jeu pour le moment.</p>
        )}
      </section>
    </div>
  )
}
