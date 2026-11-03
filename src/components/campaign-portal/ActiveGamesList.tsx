'use client'

import { ArrowRight, Gamepad2, Check } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

interface Campaign {
  id: string
  title: string
  endDate: string | Date
  startDate: string | Date
  partnerId: string | null
  partner?: {
    name: string
  } | null
  prizes: Array<{
    id: string
    name: string
    drawDate?: string | Date | null
  }>
}

interface ActiveGamesListProps {
  campaigns: Campaign[]
  activeCampaign: Campaign
  handleSwitchCampaign: (campaignId: string) => void
}

const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export function ActiveGamesList({
  campaigns,
  activeCampaign,
  handleSwitchCampaign,
}: ActiveGamesListProps) {
  return (
    <div className="lg:col-span-5 min-w-0">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-2xl text-ink-900">Jeux en cours</h2>
        <span className="text-[13px] text-ink-500 tabular-nums">
          {campaigns.length} jeu{campaigns.length > 1 ? 'x' : ''}
        </span>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="Aucun jeu actif pour le moment"
          description="Revenez bientôt : de nouveaux jeux seront disponibles."
          className="bg-surface border border-rule rounded-2xl"
        />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => {
            const isActiveGame = c.id === activeCampaign.id
            const drawPrizes = c.prizes.filter((p) => p.drawDate)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => handleSwitchCampaign(c.id)}
                  aria-current={isActiveGame ? 'true' : undefined}
                  className={`w-full text-left rounded-[22px] border-2 p-5 transition-[transform,background-color,border-color] duration-200 cursor-pointer hover:-translate-y-0.5 ${
                    isActiveGame ? 'border-brand-500 bg-brand-50' : 'border-rule bg-surface hover:border-rule-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink-500 truncate">
                        {c.partner?.name || 'Partenaire'} · jusqu’au {formatDate(c.endDate)}
                      </p>
                      <h3 className="mt-1 text-lg text-ink-900 leading-snug line-clamp-2">{c.title}</h3>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        isActiveGame ? 'bg-brand-600 text-white' : 'text-ink-900 bg-ambre-300'
                      }`}
                    >
                      {isActiveGame ? <><Check className="h-3 w-3" aria-hidden="true" /> En cours</> : <>Jouer <ArrowRight className="h-3 w-3" aria-hidden="true" /></>}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-ink-700">
                    {c.prizes.length} lot{c.prizes.length > 1 ? 's' : ''} à gagner
                    {drawPrizes.length > 0 && (
                      <span className="text-ink-500"> · tirage le {formatDate(drawPrizes[0].drawDate!)}</span>
                    )}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
