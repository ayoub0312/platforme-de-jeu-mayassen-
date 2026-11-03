'use client'

import { Gift, Ticket, Sparkles, Trophy } from 'lucide-react'
import { trpc } from '@/utils/trpc'

export default function MesJeuxPage() {
  const { data: newGames, isLoading: newGamesLoading } = trpc.getNewGames.useQuery()
  const { data: activity, isLoading: activityLoading } = trpc.getMyGameActivity.useQuery()

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Mes jeux</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1.5 max-w-lg">Vos lots gagnés, vos participations et les campagnes accessibles.</p>
      </header>

      {/* Lots gagnés */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-3">Lots gagnés</h2>
        {activityLoading ? (
          <div className="h-24 rounded-2xl skeleton-shimmer" />
        ) : activity && activity.prizesWon.length > 0 ? (
          <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] divide-y divide-black/[0.05] overflow-hidden">
            {activity.prizesWon.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--ink-900)] truncate">{p.prizeName}</div>
                  <div className="text-[12px] text-[var(--ink-500)] mt-0.5 truncate">{p.campaignTitle}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-black/[0.04] text-[var(--ink-500)] border-black/10">{p.status}</span>
                  <div className="text-[11px] text-[var(--ink-500)]/70 mt-1 tabular-nums">{new Date(p.claimedAt).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/[0.1] py-10 px-6 text-center">
            <div className="h-11 w-11 rounded-xl bg-[var(--surface-alt)] flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-5 w-5 text-[var(--ink-500)]" />
            </div>
            <p className="text-sm text-[var(--ink-500)]">Aucun lot gagné pour l'instant.</p>
          </div>
        )}
      </section>

      {/* Mes participations */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-3">Mes participations</h2>
        {activityLoading ? (
          <div className="h-24 rounded-2xl skeleton-shimmer" />
        ) : activity && activity.participations.length > 0 ? (
          <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] divide-y divide-black/[0.05] overflow-hidden">
            {activity.participations.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--ink-900)] truncate">{p.campaignTitle}</div>
                  <div className="text-[12px] text-[var(--ink-500)] mt-0.5">{p.gameMode === 'ROULETTE' ? 'Roulette' : 'Tirage au sort'}</div>
                </div>
                <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-black/[0.04] text-[var(--ink-500)] border-black/10">{p.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/[0.1] py-10 px-6 text-center">
            <div className="h-11 w-11 rounded-xl bg-[var(--surface-alt)] flex items-center justify-center mx-auto mb-3">
              <Ticket className="h-5 w-5 text-[var(--ink-500)]" />
            </div>
            <p className="text-sm text-[var(--ink-500)] max-w-sm mx-auto">Aucune participation pour l'instant — inscrivez-vous à une campagne active depuis le site pour commencer à jouer.</p>
          </div>
        )}
      </section>

      {/* Nouveaux jeux */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-3">Nouveaux jeux Obooking Gift</h2>
        {newGamesLoading ? (
          <div className="h-40 rounded-2xl skeleton-shimmer" />
        ) : newGames && newGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {newGames.map((c) => (
              <div key={c.id} className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-sm)] overflow-hidden transition-shadow hover:shadow-[var(--shadow-premium-md)]">
                {c.imageData && c.imageMimeType ? (
                  <img src={`data:${c.imageMimeType};base64,${c.imageData}`} alt={c.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-[var(--surface-alt)] flex items-center justify-center">
                    <Gift className="h-7 w-7 text-[var(--ink-500)]/40" />
                  </div>
                )}
                <div className="p-5">
                  <div className="text-sm font-semibold text-[var(--ink-900)]">{c.title}</div>
                  <div className="text-[12px] text-[var(--ink-500)] mt-0.5">{c.partnerName}</div>
                  {c.description && <p className="text-[13px] text-[var(--ink-500)] mt-2 line-clamp-2">{c.description}</p>}
                  {c.prizeNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {c.prizeNames.slice(0, 3).map((name, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-500)]/20">{name}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] text-[var(--ink-500)]/70 mt-3 tabular-nums">
                    Jusqu'au {new Date(c.endDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/[0.1] py-10 px-6 text-center">
            <div className="h-11 w-11 rounded-xl bg-[var(--surface-alt)] flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-5 w-5 text-[var(--ink-500)]" />
            </div>
            <p className="text-sm text-[var(--ink-500)]">Aucun nouveau jeu pour le moment.</p>
          </div>
        )}
      </section>
    </div>
  )
}
