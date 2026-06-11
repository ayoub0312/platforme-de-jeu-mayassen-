'use client'

import { Play } from 'lucide-react'
import { RouletteWheel } from '../RouletteWheel'

interface GameTabProps {
  activeCampaign: any
  playerEmail: string
  spinsLeft: number
  onSpinSuccess: (prize: any, remainingSpins: number) => void
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
      <div className="mb-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full text-[#FF8C00] font-black text-xs flex items-center gap-2 tracking-wide shadow-sm">
        <Play className="h-3.5 w-3.5 fill-[#FF8C00]" />
        {spinsLeft} lancers restants
      </div>

      <RouletteWheel
        campaignId={activeCampaign.id}
        prizes={activeCampaign.prizes.filter((p: any) => !p.drawDate)}
        email={playerEmail}
        onSpinSuccess={onSpinSuccess}
      />
    </div>
  )
}
