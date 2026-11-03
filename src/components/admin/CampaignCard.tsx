'use client'

import { Users, Gift, Sliders, Pencil, Copy, Trash2, RefreshCw, Trophy, Disc3, Ticket } from 'lucide-react'
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

const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function IconAction({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-lg text-ink-500 transition-colors duration-150 cursor-pointer disabled:opacity-40 ${
        danger ? 'hover:text-[var(--danger)] hover:bg-[var(--danger)]/[0.07]' : 'hover:text-ink-900 hover:bg-black/[0.05]'
      }`}
    >
      {children}
    </button>
  )
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
  const ModeIcon = c.gameMode === 'ROULETTE' ? Disc3 : Ticket

  return (
    <Card hoverLift className="flex flex-col overflow-hidden">
      <div className="relative h-28 border-b border-rule bg-paper-2 overflow-hidden">
        {c.imageData ? (
          <img src={`data:${c.imageMimeType || 'image/jpeg'};base64,${c.imageData}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-end p-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
              <ModeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {c.gameMode === 'ROULETTE' ? 'Roulette' : 'Tirage au sort'}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge status={status} className="bg-surface" />
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-semibold text-ink-900 text-[15px] leading-snug truncate" title={c.title}>{c.title}</h4>
        <p className="text-[13px] text-ink-500 mt-0.5 truncate">
          {c.partner?.name || 'Campagne système'} · {formatDate(c.startDate)} – {formatDate(c.endDate)}
        </p>

        <dl className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <dt className="text-xs text-ink-500 flex items-center gap-1"><Users className="h-3 w-3" aria-hidden="true" /> Participants</dt>
            <dd className="text-lg font-semibold text-ink-900 tabular-nums leading-tight mt-0.5">{c._count.leads}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500 flex items-center gap-1"><Gift className="h-3 w-3" aria-hidden="true" /> Lots</dt>
            <dd className="text-lg font-semibold text-ink-900 tabular-nums leading-tight mt-0.5">{c._count.prizes}</dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="inline-flex p-0.5 rounded-full bg-paper-2 border border-rule" role="group" aria-label="Type de jeu">
            {(['ROULETTE', 'DRAW'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSetGameMode(mode)}
                aria-pressed={c.gameMode === mode}
                className={`h-7 px-3 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer ${
                  c.gameMode === mode ? 'bg-surface text-ink-900 shadow-[0_0_0_1px_var(--rule)]' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {mode === 'ROULETTE' ? 'Roulette' : 'Tirage'}
              </button>
            ))}
          </div>
          {c.gameMode === 'ROULETTE' && (
            <label className="flex items-center gap-1.5 text-xs text-ink-500 whitespace-nowrap">
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
                className="w-12 h-7 bg-surface border border-rule-strong text-ink-900 px-1.5 rounded-md text-xs font-medium text-center tabular-nums focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5 border-t border-rule flex items-center justify-between gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={c.isActive}
          onClick={onToggleActive}
          disabled={isTogglingActive}
          className="inline-flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-full text-xs font-medium text-ink-700 hover:bg-black/[0.04] cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <span className={`relative h-4 w-7 rounded-full transition-colors duration-150 ${c.isActive ? 'bg-[var(--success)]' : 'bg-slate-300'}`} aria-hidden="true">
            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-150 ${c.isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </span>
          {isTogglingActive ? <RefreshCw className="h-3 w-3 animate-spin" /> : c.isActive ? 'Active' : 'En pause'}
        </button>
        <div className="flex items-center">
          <IconAction label="Configurer les lots" onClick={onConfigure}><Sliders className="h-4 w-4" /></IconAction>
          {c.gameMode === 'DRAW' && onManageDraws && (
            <IconAction label="Gérer le tirage au sort" onClick={onManageDraws}><Trophy className="h-4 w-4" /></IconAction>
          )}
          <IconAction label="Modifier" onClick={onEdit}><Pencil className="h-4 w-4" /></IconAction>
          <IconAction label="Dupliquer" onClick={onDuplicate} disabled={isDuplicating}>
            {isDuplicating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </IconAction>
          <IconAction label="Supprimer" onClick={onDelete} danger><Trash2 className="h-4 w-4" /></IconAction>
        </div>
      </div>
    </Card>
  )
}
