'use client'

import { Calendar, Globe, Sparkles, Ticket, Gift } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { WizardInfoState } from './types'
import type { ConfigPrize } from '../../campaign-config/types'

interface StepRecapProps {
  info: WizardInfoState
  gameMode: 'ROULETTE' | 'DRAW'
  prizes: ConfigPrize[]
  partnerName: string
}

export function StepRecap({ info, gameMode, prizes, partnerName }: StepRecapProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 p-4 bg-surface-alt border border-black/[0.06] rounded-[var(--radius-ds-md)]">
        <div className="h-16 w-16 shrink-0 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] overflow-hidden flex items-center justify-center">
          {info.imageData ? (
            <img src={`data:${info.imageMimeType || 'image/jpeg'};base64,${info.imageData}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <Gift className="h-6 w-6 text-ink-500/40" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-display text-lg font-semibold text-ink-900 truncate">{info.title || 'Sans titre'}</h4>
          {info.description && <p className="text-ink-500 text-xs mt-1 line-clamp-2">{info.description}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {info.category && <Badge status="info">{info.category}</Badge>}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-500">
              <Globe className="h-3 w-3" /> {partnerName}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-500">
              <Calendar className="h-3 w-3" />
              {info.startDate && new Date(info.startDate).toLocaleDateString('fr-FR')} → {info.endDate && new Date(info.endDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
        {gameMode === 'ROULETTE' ? <Sparkles className="h-4 w-4 text-brand-500" /> : <Ticket className="h-4 w-4 text-brand-500" />}
        {gameMode === 'ROULETTE' ? 'Roulette' : 'Tirage au sort'}
      </div>

      <div>
        <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-2">Lots configurés ({prizes.length})</p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {prizes.map((p, i) => (
            <div key={p.id ?? i} className="flex items-center justify-between gap-3 px-3 py-2 bg-surface-alt border border-black/[0.06] rounded-[var(--radius-ds-sm)] text-xs">
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-bold text-ink-900 truncate">{p.name}</span>
              </span>
              <span className="text-ink-500 font-semibold shrink-0">
                {p.drawDate ? new Date(p.drawDate).toLocaleDateString('fr-FR') : `${Math.round(p.winProbability * 100)}%`}
                {' · '}
                {p.type === 'PHYSICAL' ? 'Physique' : 'Numérique'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
