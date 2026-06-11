'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, ChevronRight, Copy } from 'lucide-react'

interface HeroBannerProps {
  activeCampaign: any
  playerEmail: string | null
  setActiveTab: (tab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges') => void
  isPromoCopied: boolean
  handleCopyPromo: (code: string) => void
}

export function HeroBanner({
  activeCampaign,
  playerEmail,
  setActiveTab,
  isPromoCopied,
  handleCopyPromo,
}: HeroBannerProps) {
  const [activeAdIndex, setActiveAdIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % 3)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const pName = activeCampaign.partner?.name || ' '
  const isToutEstLa = pName.toLowerCase().includes('tout est la') || pName.toLowerCase().includes('tout')
  const brandButton = 'bg-linear-to-r from-[#FF8C00] to-[#e07b00] hover:from-[#e07b00] hover:to-[#c66c00] shadow-[#FF8C00]/20 hover:shadow-[#FF8C00]/35'
  const brandGlow1 = 'bg-orange-500/[0.03]'

  return (
    <div className="w-full rounded-[32px] p-6 sm:p-8 md:p-12 text-left relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(15,23,42,0.05)] mb-10 group transition-all duration-500 hover:border-slate-300 pb-16 md:pb-12 border border-transparent">
      {/* Embedded custom CSS animation stylesheet */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes shine {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }
        .animate-shine {
          position: relative;
          overflow: hidden;
        }
        .animate-shine::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -100%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(25deg);
          animation: shine 4.5s ease-in-out infinite;
        }
      `}} />

      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.015)_1px,transparent_1px)] pointer-events-none" />

      {/* Dynamic Ambient Blur Lights */}
      <div className={`absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full blur-[140px] pointer-events-none transition-all duration-1000 group-hover:scale-105 ${brandGlow1}`}></div>
      <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full blur-[140px] pointer-events-none transition-all duration-1000 group-hover:scale-105"></div>

      <div className="relative z-10 flex flex-col justify-between min-h-[260px] space-y-6 md:space-y-8">

        {/* Primary Content (Dynamic Slideshow) */}
        <div className="max-w-3xl space-y-4">
          {activeAdIndex === 0 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black text-black leading-[1.15] tracking-tight">
                {activeCampaign.adTitle1 || "Évadez-vous aux Seychelles avec -15%"}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                {activeCampaign.adDesc1 || "Profitez de notre offre exclusive de saison en partenariat avec Obooking Voyage. Réservez votre séjour et envolez-vous vers des plages de sable blanc."}
              </p>
            </div>
          )}

          {activeAdIndex === 1 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black text-black leading-[1.15] tracking-tight">
                {activeCampaign.adTitle2 || "Gagnez un séjour de Rêve aux Maldives !"}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                {activeCampaign.adDesc2 || "Le grand prix de la roulette Obooking est un séjour de rêve 5 jours tout compris aux Maldives. Chaque défi complété augmente vos chances !"}
              </p>
            </div>
          )}

          {activeAdIndex === 2 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black text-black leading-[1.15] tracking-tight">
                {activeCampaign.adTitle3 || "Faites vos achats et Gagnez des lancers !"}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                {activeCampaign.adDesc3 || "Faites vos achats chez Tout est la, récupérez votre code QR de jeu ou téléchargez votre ticket de caisse dans l'onglet des défis pour débloquer immédiatement +5 spins bonus."}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
          <button
            onClick={() => {
              if (playerEmail) {
                setActiveTab('challenges')
              } else {
                const element = document.getElementById('play-zone')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }
            }}
            className={`w-full sm:max-w-[260px] h-12 inline-flex justify-center items-center text-white font-black text-xs rounded-xl shadow-lg transition-all duration-300 gap-2 active:scale-97 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 animate-shine ${brandButton}`}
          >
             Relever les Défis &amp; Jouer
          </button>
          <a
            href={activeCampaign.promoUrl || "https://obooking.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:max-w-[260px] h-12 inline-flex justify-center items-center bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-900 font-extrabold text-xs rounded-xl transition-all duration-300 gap-2 active:scale-97 cursor-pointer hover:scale-[1.02]"
          >
            Visiter l'Agence <ArrowRight className="h-3.5 w-3.5 text-slate-450 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Horizontal Promo */}
        {(activeCampaign.promoTitle || activeCampaign.promoCode) && (
          <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-3xl transition-all duration-300 relative group/promo w-full">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PROMO FLASH DU MOMENT</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8C00] animate-pulse" />
              </div>
              <h4 className="text-xs font-black text-slate-900 capitalize">
                {activeCampaign.promoTitle || "🌴 Seychelles Island Escape"}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-lg">
                {activeCampaign.promoDesc || "Voyagez à prix réduit vers les îles Seychelles avec le code promo exclusif d'Obooking."}
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              {activeCampaign.promoCode && (
                <button
                  onClick={() => handleCopyPromo(activeCampaign.promoCode!)}
                  className={`flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border ${isPromoCopied ? 'border-emerald-300 text-emerald-600' : 'border-slate-200 text-slate-800'} rounded-xl px-3 py-2 text-xxs font-mono font-black transition-all active:scale-97 cursor-pointer`}
                  title="Copier le code"
                >
                  <span>{activeCampaign.promoCode}</span>
                  {isPromoCopied ? (
                    <span className="text-emerald-600 text-[10px]">✔</span>
                  ) : (
                    <Copy className="h-3 w-3 text-slate-400 group-hover/promo:text-[#FF8C00] transition-colors" />
                  )}
                </button>
              )}

              {activeCampaign.promoUrl && (
                <a
                  href={activeCampaign.promoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#FF8C00]/10 hover:bg-[#FF8C00]/20 border border-[#FF8C00]/20 hover:border-[#FF8C00]/30 text-[#FF8C00] hover:text-[#FF8C00] font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                >
                  Réserver <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
