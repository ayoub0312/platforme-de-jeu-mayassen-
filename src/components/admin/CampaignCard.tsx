'use client'

import { Calendar, Users, Gift, Sliders, Edit2, Copy, Trash2, RefreshCw, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export interface CampaignCardData {
  id: string
  title: string
  isActive: boolean
  gameMode: 'ROULETTE' | 'DRAW'
  spinsPerClient: number
  startDate: string | Date
  endDate: string | Date
  imageData: string | null
  imageMimeType: string | null
  partner: { id: string; name: string } | null
  _count: { leads: number; prizes: number }
}

export interface CampaignCardProps {
  campaign: CampaignCardData
  onToggleActive: () => void
  onSetGameMode: (mode: 'ROULETTE' | 'DRAW') => void
  onSpinsPerClientChange: (value: number) => void
  onConfigure: () => void
  onManageDraws?: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  isTogglingActive?: boolean
  isDuplicating?: boolean
}

function campaignStatus(campaign: CampaignCardData): 'actif' | 'pause' | 'termine' {
  if (new Date(campaign.endDate) < new Date()) return 'termine'
  return campaign.isActive ? 'actif' : 'pause'
}

export function CampaignCard({
  campaign: c,
  onToggleActive,
  onSetGameMode,
  onSpinsPerClientChange,
  onConfigure,
  onManageDraws,
  onEdit,
  onDuplicate,
  onDelete,
  isTogglingActive,
  isDuplicating,
}: CampaignCardProps) {
  const status = campaignStatus(c)

  return (
    <Card hoverLift className="flex flex-col overflow-hidden">
      <div className="relative h-28 bg-surface-alt flex items-center justify-center overflow-hidden">
        {c.imageData ? (
          <img src={`data:${c.imageMimeType || 'image/jpeg'};base64,${c.imageData}`} alt={c.title} className="w-full h-full object-cover" />
        ) : (
          <Gift className="h-8 w-8 text-ink-500/30" />
        )}
        <div className="absolute top-2.5 left-2.5">
          <Badge status={status} />
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-bold text-ink-900 text-sm truncate">{c.title}</h4>
        <p className="text-xs text-ink-500 mt-0.5 truncate">{c.partner?.name || 'Campagne système'}</p>

        <div className="flex items-center gap-1.5 text-[10px] text-ink-500 font-semibold mt-2">
          <Calendar className="h-3 w-3" />
          {new Date(c.startDate).toLocaleDateString('fr-FR')} → {new Date(c.endDate).toLocaleDateString('fr-FR')}
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-ink-700 font-bold">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-brand-500" /> {c._count.leads}</span>
          <span className="inline-flex items-center gap-1"><Gift className="h-3.5 w-3.5 text-brand-500" /> {c._count.prizes}</span>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <button
            type="button"
            onClick={() => onSetGameMode('ROULETTE')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wide border transition-all cursor-pointer ${
              c.gameMode === 'ROULETTE' ? 'bg-gradient-brand-signature border-transparent text-white' : 'bg-surface-alt border-black/[0.06] text-ink-500 hover:bg-black/[0.04]'
            }`}
          >
            Roulette
          </button>
          <button
            type="button"
            onClick={() => onSetGameMode('DRAW')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wide border transition-all cursor-pointer ${
              c.gameMode === 'DRAW' ? 'bg-ink-900 border-transparent text-white' : 'bg-surface-alt border-black/[0.06] text-ink-500 hover:bg-black/[0.04]'
            }`}
          >
            Tirage
          </button>
          <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-ink-500">
            Lancers
            <input
              key={c.id + c.spinsPerClient}
              type="number"
              min={1}
              max={20}
              defaultValue={c.spinsPerClient}
              onBlur={(e) => {
                const value = Math.max(1, Math.min(20, Number(e.target.value) || 1))
                if (value !== c.spinsPerClient) onSpinsPerClientChange(value)
              }}
              className="w-11 bg-surface-alt border border-black/[0.06] text-ink-700 px-1 py-0.5 rounded-md text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isTogglingActive}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors disabled:opacity-50 ${
              c.isActive ? 'bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20' : 'bg-black/[0.06] text-ink-500 hover:bg-black/[0.1]'
            }`}
          >
            {isTogglingActive ? <RefreshCw className="h-3 w-3 animate-spin" /> : c.isActive ? 'Mettre en pause' : 'Activer'}
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onConfigure} title="Configurer" className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white transition-colors cursor-pointer">
              <Sliders className="h-3.5 w-3.5" />
            </button>
            {c.gameMode === 'DRAW' && onManageDraws && (
              <button type="button" onClick={onManageDraws} title="Gérer le tirage au sort" className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer">
                <Trophy className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" onClick={onEdit} title="Modifier" className="p-2 rounded-lg bg-surface-alt text-ink-500 hover:bg-black/[0.08] transition-colors cursor-pointer">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onDuplicate} disabled={isDuplicating} title="Dupliquer" className="p-2 rounded-lg bg-surface-alt text-ink-500 hover:bg-black/[0.08] transition-colors cursor-pointer disabled:opacity-50">
              {isDuplicating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={onDelete} title="Supprimer" className="p-2 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
