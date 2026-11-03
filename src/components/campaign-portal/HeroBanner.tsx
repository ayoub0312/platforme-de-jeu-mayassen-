'use client'

import { useState, useEffect, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check, Copy, Gift } from 'lucide-react'

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

  const goPlay = () => {
    if (playerEmail) {
      setActiveTab('challenges')
    } else {
      document.getElementById('play-zone')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <section
      className="mb-10 rounded-2xl border border-rule bg-surface overflow-hidden"
      style={{ boxShadow: 'var(--shadow-premium-sm)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="p-6 sm:p-10 flex flex-col min-w-0">
          <p className="text-[13px] text-ink-500">
            {partnerName} · jusqu’au {formatDate(activeCampaign.endDate)}
          </p>

          <div className="mt-3 min-h-[9.5rem]" aria-live="polite">
            <h1 key={activeIndex} className="animate-fade-in text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-ink-900 [overflow-wrap:anywhere]">
              {slide.title}
            </h1>
            {slide.desc && (
              <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-ink-700 max-w-xl">{slide.desc}</p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goPlay}
              className="inline-flex h-12 items-center gap-2 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {playerEmail ? 'Gagner des lancers' : 'Participer'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href="https://www.obooking.tn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-1.5 px-5 rounded-full text-[15px] font-medium text-ink-900 hover:bg-black/[0.04] transition-colors whitespace-nowrap"
            >
              Visiter Obooking <ArrowUpRight className="h-4 w-4 text-ink-500" aria-hidden="true" />
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
                  <span className={`block h-1 rounded-full transition-all duration-200 ${i === activeIndex ? 'w-6 bg-ink-900' : 'w-3 bg-rule-strong'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {realPrizes.length > 0 && (
          <div className="border-t lg:border-t-0 lg:border-l border-rule bg-paper-2 p-6 sm:p-8 min-w-0">
            <p className="text-[13px] font-medium text-ink-500">À gagner</p>
            <ul className="mt-4 space-y-3">
              {realPrizes.map((prize) => (
                <li key={prize.id} className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-lg bg-surface border border-rule text-brand-700 flex items-center justify-center shrink-0" aria-hidden="true">
                    <Gift className="h-4 w-4" />
                  </span>
                  <span className="text-[15px] font-medium text-ink-900 truncate">{prize.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(activeCampaign.promoTitle || activeCampaign.promoCode) && (
        <div className="border-t border-rule px-6 sm:px-10 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                className="inline-flex h-10 items-center gap-1.5 px-4 rounded-full bg-ink-900 hover:bg-slate-800 text-paper text-sm font-medium transition-colors whitespace-nowrap"
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
