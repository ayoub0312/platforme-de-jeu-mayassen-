'use client'

import { Trophy } from 'lucide-react'

interface PrizesTabProps {
  playerInfo: any
}

export function PrizesTab({ playerInfo }: PrizesTabProps) {
  const prizes = playerInfo?.prizesWon || []

  return (
    <div className="w-full text-left">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
        <Trophy className="h-4 w-4 text-[#FF8C00]" /> Vos gains enregistrés ({prizes.length})
      </h3>

      {prizes.length > 0 ? (
        <div className="space-y-2.5 max-h-[300px]  overflow-y-auto pr-1">
          {prizes.map((wp: any, idx: number) => (
            <div key={idx} className="flex border-none justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-150 shadow-sm transition-all hover:bg-slate-100/50">
              <div>
                <div className="font-extrabold text-slate-800 text-xs">{wp.prizeName}</div>
                <div className="text-[10px] text-slate-450 mt-1 font-medium">
                  Gagné le : {new Date(wp.claimedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">
                {wp.status === 'PENDING' ? 'En attente' : 'Reçu'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-slate-400 bg-slate-50 border border-slate-150 rounded-2xl font-semibold">
          Aucun gain pour le moment. Lancez la roue pour jouer !
        </div>
      )}
    </div>
  )
}
