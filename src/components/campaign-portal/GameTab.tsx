'use client'

import { Play, CheckCircle } from 'lucide-react'
import { RouletteWheel } from '../RouletteWheel'

interface GameTabProps {
  activeCampaign: any
  playerEmail: string
  spinsLeft: number
  onSpinSuccess: (prize: any, remainingSpins: number) => void
  playerInfo: any
  uploadingReceipt: boolean
  handleReceiptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function GameTab({
  activeCampaign,
  playerEmail,
  spinsLeft,
  onSpinSuccess,
}: GameTabProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Real-time credits indicator */}
      <p className="mb-2 inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-paper-2 border border-rule text-[13px] text-ink-700" aria-live="polite">
        <Play className="h-3.5 w-3.5 text-brand-600 fill-current" aria-hidden="true" />
        <span><strong className="font-semibold text-ink-900 tabular-nums">{spinsLeft}</strong> lancer{spinsLeft > 1 ? 's' : ''} restant{spinsLeft > 1 ? 's' : ''}</span>
      </p>

      {spinsLeft === 0 && (
        <p className="text-[13px] text-ink-500 flex items-center gap-1.5 mb-2">
          <CheckCircle className="h-3.5 w-3.5" /> Vous avez utilisé tous vos lancers. Relevez un défi pour en gagner.
        </p>
      )}

      <RouletteWheel
        campaignId={activeCampaign.id}
        prizes={activeCampaign.prizes.filter((p: any) => !p.drawDate)}
        email={playerEmail}
        onSpinSuccess={onSpinSuccess}
        size="premium"
        showCountdown
        disabled={spinsLeft === 0}
      />
    </div>
  )
}
