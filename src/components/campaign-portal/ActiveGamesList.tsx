'use client'

import { Calendar, ArrowRight } from 'lucide-react'

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

export function ActiveGamesList({
  campaigns,
  activeCampaign,
  handleSwitchCampaign,
}: ActiveGamesListProps) {
  return (
    <div className="lg:col-span-5 space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
          🎰 Jeux Actifs
        </h3>
        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-xxs font-black text-slate-600">
          {campaigns.length} {campaigns.length > 1 ? 'Jeux' : 'Jeu'}
        </span>
      </div>

      <div className="space-y-4">
        {campaigns.map((c) => {
          const isActiveGame = c.id === activeCampaign.id
          const partnerName = c.partner?.name || 'Partenaire B2B'

          // Custom branding palettes per partner
          let brandBadge = 'bg-orange-50 text-orange-700 border-orange-100'
          let brandRing = 'border-orange-300'
          let textHighlight = 'text-[#FF8C00]'

          return (
            <div
              key={c.id}
              className={`bg-white border rounded-3xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${isActiveGame ? `${brandRing} border-2 scale-[1.01]` : 'border-slate-200 hover:border-slate-300'
                }`}
            >
              {/* Partner Header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-black ${brandBadge}`}>
                  🤝 {partnerName}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Exp: {new Date(c.endDate).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">{c.title}</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                Tentez de remporter l'un des {c.prizes.length} lots disponibles.
              </p>

              {/* Compact Scheduled Draw Info */}
              {c.prizes.some((p) => p.drawDate) && (
                <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-1 shadow-sm">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    ✨ Tirage Exceptionnel
                  </span>
                  <div className="text-[10px] font-bold text-slate-700 leading-snug">
                    {c.prizes
                      .filter((p) => p.drawDate)
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2">
                          <span>• {p.name}</span>
                          <span className="text-slate-400 text-xxs shrink-0 font-medium">
                            Le {new Date(p.drawDate!).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Compact Challenges List */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2 text-[10px] text-slate-600 font-bold">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                    🎡 Défis Roulette (Lancers) :
                  </span>
                  <div className="space-y-0.5 pl-1.5">
                    <div className="flex items-center gap-1.5">
                      • ✈️ Visiter l'agence Obooking <span className={`font-black ${textHighlight}`}>+1 lancer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      • 📸 Suivre sur Instagram <span className={`font-black ${textHighlight}`}>+1 lancer</span>
                    </div>
                  </div>
                </div>

                {c.prizes.some((p) => p.drawDate) && (
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                      🎟️ Défis Tirage :
                    </span>
                    <div className="space-y-0.5 pl-1.5">
                      <div className="flex items-center gap-1.5">• 🧾 Scanner ticket caisse {partnerName}</div>
                      <div className="flex items-center gap-1.5">• 🎟️ S'inscrire au Grand Tirage</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                {isActiveGame ? (
                  <>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sélectionné
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${brandBadge} flex items-center gap-1`}>
                      🎡 En cours
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400 font-semibold">Prêt à jouer ?</span>
                    <button
                      onClick={() => handleSwitchCampaign(c.id)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                    >
                      Jouer à ce jeu <ArrowRight className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
