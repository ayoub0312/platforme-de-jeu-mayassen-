'use client'

import { useState, useEffect, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, Copy, Gift, Plane } from 'lucide-react'

interface HeroBannerProps {
  activeCampaign: any
  playerEmail: string | null
  setActiveTab: (tab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges') => void
  isPromoCopied: boolean
  handleCopyPromo: (code: string) => void
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

export function HeroBanner({
  activeCampaign,
  playerEmail,
  setActiveTab,
  isPromoCopied,
  handleCopyPromo,
}: HeroBannerProps) {
  const prefersReducedMotion = useReducedMotion()

  // Lots réels de la campagne (hors segments illimités de consolation).
  const realPrizes: { id: string; name: string }[] = useMemo(() => {
    const prizes = (activeCampaign.prizes || []) as { id: string; name: string; totalStock: number }[]
    const limited = prizes.filter((p) => p.totalStock !== -1)
    return (limited.length > 0 ? limited : prizes).slice(0, 4)
  }, [activeCampaign.prizes])

  // Slides : uniquement les textes saisis par l'admin/partenaire. Sans texte
  // saisi, un seul slide construit à partir des vrais lots — jamais de lot
  // ou de destination inventés.
  const slides = useMemo(() => {
    const custom = [1, 2, 3]
      .map((n) => ({ title: activeCampaign[`adTitle${n}`] as string | null, desc: activeCampaign[`adDesc${n}`] as string | null }))
      .filter((s) => s.title)
    if (custom.length > 0) return custom as { title: string; desc: string | null }[]
    const prizeNames = realPrizes.map((p) => p.name)
    return [
      {
        title: activeCampaign.title as string,
        desc: prizeNames.length > 0
          ? `Tentez de remporter ${prizeNames.slice(0, 2).join(' ou ')}${prizeNames.length > 2 ? ' et d’autres lots' : ''}. Participation jusqu’au ${formatDate(activeCampaign.endDate)}.`
          : `Participation jusqu’au ${formatDate(activeCampaign.endDate)}.`,
      },
    ]
  }, [activeCampaign, realPrizes])

  const [activeIndex, setActiveIndex] = useState(0)
  // Rotation suspendue au survol et au focus clavier (WCAG 2.2.2).
  const [isPaused, setIsPaused] = useState(false)
  useEffect(() => {
    if (slides.length < 2 || prefersReducedMotion || isPaused) return
    const timer = setInterval(() => setActiveIndex((i) => (i + 1) % slides.length), 7000)
    return () => clearInterval(timer)
  }, [slides.length, prefersReducedMotion, isPaused])

  const slide = slides[Math.min(activeIndex, slides.length - 1)]
  const partnerName = activeCampaign.partner?.name || 'Obooking'

  const isDraw = activeCampaign.gameMode === 'DRAW'
  const goPlay = () => {
    if (playerEmail) {
      setActiveTab(isDraw ? 'draws' : 'challenges')
      document.getElementById('play-zone')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    } else {
      document.getElementById('play-zone')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <section
      className="mb-10 rounded-[28px] bg-surface relative w-full"
      style={{ boxShadow: 'var(--shadow-premium-md)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Bandeau de la carte d'embarquement */}
      <div className="relative flex items-center justify-between gap-4 rounded-t-[28px] bg-brand-500 px-6 sm:px-10 h-16 overflow-hidden">
        <p className="font-display text-xl font-semibold text-ink-900">Carte d&apos;embarquement</p>
        <p className="text-sm font-semibold text-ink-900 truncate">{partnerName}</p>
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 64" preserveAspectRatio="none">
          <path d="M 300 52 C 420 4, 560 4, 660 40" fill="none" stroke="var(--ink-900)" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
        </svg>
        <Plane aria-hidden="true" className="pointer-events-none absolute left-[62%] top-3 h-6 w-6 rotate-45 text-ink-900/70 hidden sm:block" strokeWidth={1.75} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_auto_minmax(0,0.9fr)]">
        <div className="relative p-6 sm:p-10 flex flex-col min-w-0 text-ink-900">
          <dl className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 max-w-xl">
            <div>
              <dt className="text-xs text-ink-500">Compagnie</dt>
              <dd className="font-display text-base font-semibold truncate">{partnerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Embarquement jusqu&apos;au</dt>
              <dd className="font-display text-base font-semibold">{formatDate(activeCampaign.endDate)}</dd>
            </div>
            <div className="hidden sm:block">
              <dt className="text-xs text-ink-500">Type</dt>
              <dd className="font-display text-base font-semibold">{isDraw ? 'Tirage au sort' : 'Roulette'}</dd>
            </div>
          </dl>

          <div className="mt-6 min-h-[9.5rem]" aria-live="polite">
            <h1 key={activeIndex} className="animate-fade-in text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.02] text-ink-900 [overflow-wrap:anywhere]">
              {slide.title}
            </h1>
            {slide.desc && (
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-700 max-w-xl">{slide.desc}</p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goPlay}
              className="btn-game h-13 px-7 text-base"
            >
              {playerEmail ? (isDraw ? 'Voir le tirage' : 'Gagner des lancers') : 'Embarquer'}
            </button>
            <a
              href="https://www.obooking.tn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center gap-1.5 px-5 rounded-full text-base font-bold text-ink-900 hover:bg-black/[0.05] transition-colors whitespace-nowrap"
            >
              Visiter Obooking <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {slides.length > 1 && (
            <div className="mt-8 flex items-center gap-1.5" role="tablist" aria-label="Annonces">
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={s.title}
                  onClick={() => setActiveIndex(i)}
                  className="h-6 px-1 flex items-center cursor-pointer"
                >
                  <span className={`block h-1.5 rounded-full transition-[width,background-color] duration-200 ${i === activeIndex ? 'w-7 bg-brand-600' : 'w-3 bg-rule-strong'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Perforation + encoches */}
        <div aria-hidden="true" className="relative h-0 lg:h-auto lg:w-0 mx-6 lg:mx-0 lg:my-6 border-t-2 lg:border-t-0 lg:border-l-2 border-dashed border-rule-strong">
          <span className="absolute -left-9 -top-[11px] lg:left-[-12px] lg:-top-9 h-5 w-5 lg:h-6 lg:w-6 rounded-full bg-paper" />
          <span className="absolute -right-9 -top-[11px] lg:left-[-12px] lg:right-auto lg:top-auto lg:-bottom-9 h-5 w-5 lg:h-6 lg:w-6 rounded-full bg-paper" />
        </div>

        {realPrizes.length > 0 && (
          <div className="m-3 lg:m-4 rounded-[22px] bg-ambre-300 p-6 sm:p-7 min-w-0">
            <h2 className="text-2xl text-ink-900">À gagner</h2>
            <ul className="mt-4 space-y-3">
              {realPrizes.map((prize) => (
                <li key={prize.id} className="flex items-center gap-3 min-w-0">
                  <span className="h-10 w-10 rounded-2xl bg-ink-900 text-ambre-300 flex items-center justify-center shrink-0" aria-hidden="true">
                    <Gift className="h-4 w-4" />
                  </span>
                  <span className="text-base font-bold text-ink-900 truncate">{prize.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(activeCampaign.promoTitle || activeCampaign.promoCode) && (
        <div className="rounded-b-[28px] border-t-2 border-dashed border-rule-strong px-6 sm:px-10 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-ink-500">Offre du moment</p>
            {activeCampaign.promoTitle && (
              <p className="text-[15px] font-semibold text-ink-900 mt-0.5">{activeCampaign.promoTitle}</p>
            )}
            {activeCampaign.promoDesc && (
              <p className="text-sm text-ink-700 mt-0.5 max-w-xl">{activeCampaign.promoDesc}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeCampaign.promoCode && (
              <button
                type="button"
                onClick={() => handleCopyPromo(activeCampaign.promoCode!)}
                className={`inline-flex h-10 items-center gap-2 px-4 rounded-full border font-mono text-sm transition-colors cursor-pointer ${
                  isPromoCopied ? 'border-[var(--success)] text-[var(--success)]' : 'border-rule-strong bg-surface text-ink-900 hover:bg-paper-2'
                }`}
                aria-label={`Copier le code ${activeCampaign.promoCode}`}
              >
                {activeCampaign.promoCode}
                {isPromoCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4 text-ink-500" aria-hidden="true" />}
              </button>
            )}
            {activeCampaign.promoUrl && (
              <a
                href={activeCampaign.promoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-game h-10 px-4 text-sm"
              >
                Réserver <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
