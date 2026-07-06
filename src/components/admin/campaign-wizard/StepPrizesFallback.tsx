'use client'

import { PackageCheck } from 'lucide-react'
import type { ConfigPrize } from '../../campaign-config/types'

interface StepPrizesFallbackProps {
  prizes: ConfigPrize[]
  setPrizes: (updater: (prev: ConfigPrize[]) => ConfigPrize[]) => void
}

export function StepPrizesFallback({ prizes, setPrizes }: StepPrizesFallbackProps) {
  const updatePrize = (index: number, patch: Partial<ConfigPrize>) => {
    setPrizes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-500 font-semibold">
        Précisez le type de chaque lot et, si besoin, un lot de consolation attribué automatiquement en cas de rupture de stock.
      </p>
      {prizes.map((prize, index) => (
        <div key={prize.id ?? index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-surface-alt border border-black/[0.06] rounded-[var(--radius-ds-md)]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: prize.color }}
            />
            <span className="font-bold text-ink-900 text-sm truncate">{prize.name}</span>
            <span className="text-[10px] text-ink-500 font-semibold shrink-0">
              ({prize.totalStock === -1 ? 'Illimité' : `stock ${prize.totalStock}`})
            </span>
          </div>

          <select
            value={prize.type}
            onChange={(e) => updatePrize(index, { type: e.target.value as 'PHYSICAL' | 'DIGITAL' })}
            className="h-9 px-3 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] text-xs font-bold text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25 cursor-pointer shrink-0"
          >
            <option value="PHYSICAL">Physique</option>
            <option value="DIGITAL">Numérique</option>
          </select>

          <select
            value={prize.fallbackPrizeId ?? ''}
            onChange={(e) => updatePrize(index, { fallbackPrizeId: e.target.value || null })}
            className="h-9 px-3 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] text-xs font-bold text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25 cursor-pointer shrink-0 min-w-[220px]"
          >
            <option value="">Aucun lot de consolation</option>
            {prizes
              .filter((_, i) => i !== index)
              .map((p, i) => (
                <option key={p.id ?? i} value={p.id ?? ''} disabled={!p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      ))}

      {prizes.length === 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <PackageCheck className="h-8 w-8 text-ink-500/40 mb-2" />
          <p className="text-xs text-ink-500 font-semibold">Aucun lot configuré à l'étape précédente.</p>
        </div>
      )}
    </div>
  )
}
