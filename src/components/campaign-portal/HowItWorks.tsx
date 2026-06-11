'use client'

import { Info } from 'lucide-react'

export function HowItWorks() {
  return (
    <div className="w-full max-w-7xl mt-16 bg-white border-none rounded-3xl p-8 shadow-sm">
      <h3 className="text-center font-black text-slate-850 text-sm mb-8 flex items-center justify-center gap-1.5">
        <Info className="h-4 w-4 text-[#FF8C00]" /> Comment fonctionne la roulette ?
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
        <div className="flex flex-col items-center text-center px-4">
          <div className="h-10 w-10 rounded-full bg-orange-100 text-[#FF8C00] font-black text-sm flex items-center justify-center mb-4 shadow-sm">1</div>
          <h4 className="font-extrabold text-slate-850 text-xs mb-2">Inscription Rapide</h4>
          <p className="text-slate-450 text-[11px] leading-relaxed font-semibold">
            Renseignez vos coordonnées pour recevoir 3 jetons de jeu offerts et commencer immédiatement.
          </p>
        </div>

        <div className="flex flex-col items-center text-center px-4">
          <div className="h-10 w-10 rounded-full bg-orange-100 text-[#FF8C00] font-black text-sm flex items-center justify-center mb-4 shadow-sm">2</div>
          <h4 className="font-extrabold text-slate-850 text-xs mb-2">Lancez la Roue</h4>
          <p className="text-slate-450 text-[11px] leading-relaxed font-semibold">
            Faites tourner la roulette animée pour tenter de décrocher des voyages de rêve ou d'autres lots.
          </p>
        </div>

        <div className="flex flex-col items-center text-center px-4">
          <div className="h-10 w-10 rounded-full bg-orange-100 text-[#FF8C00] font-black text-sm flex items-center justify-center mb-4 shadow-sm">3</div>
          <h4 className="font-extrabold text-slate-850 text-xs mb-2">Gagnez des Bonus</h4>
          <p className="text-slate-450 text-[11px] leading-relaxed font-semibold">
            Partagez votre lien de partage (+2 lancers par filleul) ou relevez nos défis pour cumuler les lancers.
          </p>
        </div>
      </div>
    </div>
  )
}
