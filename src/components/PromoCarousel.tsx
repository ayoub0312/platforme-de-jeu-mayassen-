'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, ImageOff } from 'lucide-react'

interface PromoBanner {
  id: string
  imageData: string
  imageMimeType: string
  linkUrl: string | null
}

interface PromoCarouselProps {
  banners: PromoBanner[]
  intervalMs?: number
}

export function PromoCarousel({ banners, intervalMs = 5000 }: PromoCarouselProps) {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((i: number) => {
    setIndex(((i % banners.length) + banners.length) % banners.length)
  }, [banners.length])

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (isPaused || reducedMotion || banners.length <= 1) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length)
    }, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, banners.length, intervalMs, reducedMotion])

  return (
    <section className="relative bg-gradient-to-b from-white via-orange-50/20 to-slate-50 border-t border-slate-200 py-14 overflow-hidden">
      {/* Soft ambient glow — creates visual breathing room from the grid above */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[260px] bg-[radial-gradient(ellipse_at_center,var(--color-brand-gold)_0%,transparent_70%)] opacity-[0.06] pointer-events-none" />

      <div className="relative max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6">
        {/* Section eyebrow + heading with an animated gradient underline */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-[#FF8C00] text-[10px] font-black uppercase tracking-widest mb-3">
            <Sparkles className="h-3 w-3" /> Offres partenaires
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
            Nos partenaires vous gâtent
          </h2>
          <span className="promo-underline mt-2 inline-block h-1 w-16 rounded-full bg-gradient-brand" />
        </div>

        {banners.length === 0 ? (
          <div
            className="rounded-[28px] border border-dashed border-slate-200 bg-white/60 py-16 px-6 text-center"
            style={{ boxShadow: 'var(--shadow-premium-sm)' }}
          >
            <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-100 text-[#FF8C00] flex items-center justify-center mx-auto mb-4">
              <ImageOff className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-700">Aucune offre partenaire pour le moment</h3>
            <p className="text-slate-450 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
              Revenez bientôt pour découvrir les offres exclusives de nos partenaires.
            </p>
          </div>
        ) : (
        <div
          className="relative rounded-[28px] overflow-hidden ring-1 ring-slate-900/5 bg-slate-900 group"
          style={{ boxShadow: 'var(--shadow-premium-lg)' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Auto-advance progress bars — one per slide, fills over intervalMs, pauses on hover.
              Shown on hover only (same reveal pattern as the prev/next arrows below) — visible
              at all times it read as a stray white bar across the top of the image. */}
          {banners.length > 1 && (
            <div className="absolute top-0 inset-x-0 z-20 flex gap-1.5 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {banners.map((banner, i) => (
                <div key={banner.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className={`h-full bg-white rounded-full ${
                      i === index && !isPaused && !reducedMotion ? 'animate-promo-progress' : ''
                    }`}
                    style={
                      i < index
                        ? { width: '100%' }
                        : i === index
                          ? { width: isPaused || reducedMotion ? '100%' : '0%', animationDuration: `${intervalMs}ms` }
                          : { width: '0%' }
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Slides track — slides horizontally via transform, one visible at a time */}
          <div className="relative h-56 sm:h-72 md:h-[26rem] overflow-hidden">
            <div
              className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {banners.map((banner, i) => (
                <div key={banner.id} className="relative h-full w-full shrink-0 overflow-hidden">
                  <img
                    key={i === index ? `${banner.id}-active` : banner.id}
                    src={`data:${banner.imageMimeType};base64,${banner.imageData}`}
                    alt="Publicité"
                    className={`h-full w-full object-cover ${
                      i === index && !reducedMotion ? 'animate-promo-kenburns' : ''
                    }`}
                  />
                  {/* Bottom gradient scrim — guarantees dot/arrow contrast regardless of image brightness */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  {/* Banner is only clickable when a destination link is set */}
                  {banner.linkUrl && (
                    <a
                      href={banner.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Voir l'offre"
                      className="absolute inset-0"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Prev / Next arrows — only useful with more than one slide */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Publicité précédente"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Publicité suivante"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-2">
                {banners.map((banner, i) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Aller à la publicité ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer shadow-sm ${
                      i === index ? 'w-7 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        )}
      </div>

      <style jsx>{`
        @keyframes promo-progress-fill {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-promo-progress {
          animation-name: promo-progress-fill;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes promo-kenburns {
          from {
            transform: scale(1.06);
          }
          to {
            transform: scale(1);
          }
        }
        .animate-promo-kenburns {
          animation: promo-kenburns 6s ease-out forwards;
        }
        @keyframes underline-draw {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        .promo-underline {
          transform-origin: left center;
          animation: underline-draw 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-underline {
            animation: none;
          }
        }
      `}</style>
    </section>
  )
}
