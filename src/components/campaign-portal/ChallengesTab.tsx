'use client'

import { Target, CheckCircle, ArrowUpRight, Globe } from 'lucide-react'

interface InstagramProps {
  className?: string
}

function Instagram({ className }: InstagramProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

interface ChallengesTabProps {
  playerInfo: any
  handleVisitWebsite: () => void
  handleFollowSocial: () => void
}

export function ChallengesTab({
  playerInfo,
  handleVisitWebsite,
  handleFollowSocial,
}: ChallengesTabProps) {
  return (
    <div className="w-full text-left space-y-4">
      <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl mb-2">
        <h3 className="text-xs font-bold text-[#FF8C00] uppercase tracking-wide flex items-center gap-1.5">
          <Target className="h-4 w-4" /> Défis & Missions
        </h3>
        <p className="text-slate-550 text-[11px] mt-1.5 leading-relaxed font-semibold">
          Complétez ces missions simples pour gagner des lancers bonus immédiats et tenter de remporter le voyage de rêve !
        </p>
      </div>

      <div className="space-y-3">
        {/* Mission 1: Visit Booking Website */}
        <div className="flex flex-col sm:flex-row border-none sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-150 gap-4 transition-all hover:bg-slate-100/30">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-500 shrink-0" />
              <span className="text-xs font-extrabold text-slate-800">Visiter l'agence Obooking</span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-orange-100 text-[#FF8C00] uppercase tracking-wide">
                +1 Lancer
              </span>
            </div>
            <p className="text-[10px] text-slate-450 mt-1 font-medium pl-6">
              Découvrez les offres de séjours de notre agence partenaire Obooking.
            </p>
          </div>

          {playerInfo?.completedTasks?.includes('VISIT_WEBSITE') ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 self-end sm:self-center pl-6 sm:pl-0">
              <CheckCircle className="h-4 w-4 fill-emerald-100" /> Complété
            </span>
          ) : (
            <button
              onClick={handleVisitWebsite}
              className="px-3.5 py-2 bg-[#FF8C00] hover:bg-[#e07b00] text-white font-extrabold text-xxs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-end sm:self-center shrink-0 active:scale-95"
            >
              Visiter <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Mission 2: Follow on Instagram */}
        <div className="flex flex-col sm:flex-row sm:items-center border-none justify-between p-4 rounded-xl bg-slate-50 border border-slate-150 gap-4 transition-all hover:bg-slate-100/30">
          <div>
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-[#E100C6] shrink-0" />
              <span className="text-xs font-extrabold text-slate-800">Suivre Obooking sur Instagram</span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-orange-100 text-[#FF8C00] uppercase tracking-wide">
                +1 Lancer
              </span>
            </div>
            <p className="text-[10px] text-slate-450 mt-1 font-medium pl-6">
              Abonnez-vous à notre page Instagram pour des photos inspirantes.
            </p>
          </div>

          {playerInfo?.completedTasks?.includes('FOLLOW_SOCIAL') ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-650 self-end sm:self-center pl-6 sm:pl-0">
              <CheckCircle className="h-4 w-4 fill-emerald-100" /> Complété
            </span>
          ) : (
            <button
              onClick={handleFollowSocial}
              className="px-3.5 py-2 bg-linear-to-r from-[#FF307A] via-[#E100C6] to-[#8600E2] text-white font-extrabold text-xxs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-end sm:self-center shrink-0 active:scale-95 border-none"
            >
              Suivre <Instagram className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
