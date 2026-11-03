'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Gift, ArrowRight, Disc3, Ticket, Volume2, VolumeX } from 'lucide-react'
import { HowItWorksTimeline } from './HowItWorksTimeline'
import { PromoCarousel } from './PromoCarousel'

interface Prize {
  id: string
  name: string
  type: string
  totalStock: number
  remainingStock: number
  drawDate: string | null
}

interface Partner {
  id: string
  name: string
  slug: string
}

interface Campaign {
  id: string
  title: string
  startDate: string
  endDate: string
  partnerId: string | null
  partner: Partner | null
  prizes: Prize[]
  gameMode: 'ROULETTE' | 'DRAW'
  imageData: string | null
  imageMimeType: string | null
}

interface SiteSettings {
  hasHeroVideo: boolean
  heroVideoMimeType: string | null
}

interface PromoBanner {
  id: string
  imageData: string
  imageMimeType: string
  linkUrl: string | null
}

interface AggregatorPortalProps {
  initialCampaigns: Campaign[]
  isAdminConnected: boolean
  siteSettings: SiteSettings
  promoBanners: PromoBanner[]
}

// Teintes des cartes de lots (rotation corail / soleil / lagon).
const PRIZE_TONES = [
  { card: 'bg-brand-100', icon: 'bg-brand-600 text-white' },
  { card: 'bg-ambre-300', icon: 'bg-ink-900 text-ambre-300' },
  { card: 'bg-lagon-300', icon: 'bg-ink-900 text-lagon-300' },
  { card: 'bg-surface shadow-[0_0_0_2px_var(--rule)]', icon: 'bg-brand-50 text-brand-700' },
]

export function AggregatorPortal({ initialCampaigns, isAdminConnected, siteSettings, promoBanners }: AggregatorPortalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Hero video starts muted (required for autoplay in every browser) — visitor can unmute it themselves.
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const toggleVideoSound = () => {
    if (!heroVideoRef.current) return
    heroVideoRef.current.muted = !heroVideoRef.current.muted
    setIsVideoMuted(heroVideoRef.current.muted)
  }

  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Anciens liens construits depuis le nom ; le slug est préféré quand il existe.
  const getPartnerSlug = (name: string) => {
    return name.toLowerCase().trim().replace(/\s+/g, '-')
  }

  // Ticks once a minute so the "time left" labels below stay fresh — purely a
  // front-end display computed from the endDate the API already returns.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const getCountdownInfo = (endDate: string) => {
    const diffMs = new Date(endDate).getTime() - now
    if (diffMs <= 0) return { label: 'Terminé', urgent: false }
    const diffHours = diffMs / (1000 * 60 * 60)
    if (diffHours < 48) return { label: `Plus que ${Math.max(1, Math.ceil(diffHours))} h`, urgent: true }
    const diffDays = Math.ceil(diffHours / 24)
    return { label: `${diffDays} jours restants`, urgent: diffDays < 7 }
  }

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return initialCampaigns
    return initialCampaigns.filter((campaign) =>
      campaign.title.toLowerCase().includes(q) ||
      campaign.partner?.name.toLowerCase().includes(q) ||
      campaign.prizes.some((p) => p.name.toLowerCase().includes(q))
    )
  }, [initialCampaigns, searchQuery])

  // Chiffres et lots réels uniquement — rien d'inventé dans le hero.
  const partnerCount = new Set(initialCampaigns.map((c) => c.partnerId).filter(Boolean)).size
  const featuredPrizes = useMemo(
    () =>
      initialCampaigns
        .flatMap((c) => c.prizes.filter((p) => p.totalStock !== -1).map((p) => ({ prize: p, campaign: c })))
        .slice(0, 4),
    [initialCampaigns]
  )

  const campaignHref = (campaign: Campaign) =>
    campaign.partner ? `/company/${campaign.partner.slug || getPartnerSlug(campaign.partner.name)}` : null

  return (
    <main className="min-h-screen flex flex-col bg-paper text-ink-900">
      <header
        className={`sticky top-0 z-50 transition-colors duration-200 ${
          isScrolled ? 'bg-paper/95 shadow-[0_1px_0_var(--rule)]' : 'bg-brand-500'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <span className={`h-9 px-2 rounded-xl flex items-center ${isScrolled ? '' : 'bg-white'}`}>
              <Image src="/obooking-logo.png" alt="" width={140} height={64} className="h-6 w-auto object-contain" priority />
            </span>
            <span className="font-display text-lg font-semibold whitespace-nowrap text-ink-900">Obooking Gift</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-semibold" aria-label="Navigation">
            <a href="#jeux" className={`hidden sm:inline-flex h-9 items-center px-3 rounded-full transition-colors whitespace-nowrap ${isScrolled ? 'text-ink-700 hover:bg-black/[0.05]' : 'text-ink-900 hover:bg-white/30'}`}>
              Jeux en cours
            </a>
            <a href="#comment-ca-marche" className={`hidden md:inline-flex h-9 items-center px-3 rounded-full transition-colors whitespace-nowrap ${isScrolled ? 'text-ink-700 hover:bg-black/[0.05]' : 'text-ink-900 hover:bg-white/30'}`}>
              Comment ça marche
            </a>
            <Link href={isAdminConnected ? '/partner' : '/client'} className={`${isScrolled ? 'btn-game' : 'btn-game-pop'} h-10 px-4 text-sm`}>
              {isAdminConnected ? 'Mon tableau de bord' : 'Mon espace'}
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO — bandeau corail, roue illustrée (ou vidéo hero si configurée) */}
      <section className="relative bg-brand-500 text-ink-900 overflow-hidden">
        {/* Confettis décoratifs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute top-10 left-[8%] h-3 w-3 rounded-full bg-ambre-400" />
          <span className="absolute top-24 left-[44%] h-2 w-2 rounded-full bg-lagon-300" />
          <span className="absolute bottom-24 left-[4%] h-4 w-4 rotate-45 rounded-[4px] bg-lagon-400" />
          <span className="absolute top-14 right-[6%] h-2.5 w-2.5 rounded-full bg-ink-900" />
          <span className="absolute bottom-16 right-[38%] h-3 w-3 rotate-12 rounded-[3px] bg-ambre-300" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-24 sm:pt-14 sm:pb-28 lg:pt-16 lg:pb-32 grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-12 items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-ink-900 text-white text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-ambre-400" aria-hidden="true" />
              {initialCampaigns.length > 0
                ? `${initialCampaigns.length} jeu${initialCampaigns.length > 1 ? 'x' : ''} en cours chez ${partnerCount} partenaire${partnerCount > 1 ? 's' : ''}`
                : 'Nouveaux jeux bientôt'}
            </p>
            <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] font-semibold [overflow-wrap:anywhere]">
              Tournez la roue,
              <br />
              gagnez votre <span className="inline-block -rotate-1 rounded-2xl bg-ambre-400 px-3 pb-1 shadow-[0_4px_0_var(--ink-900)]">voyage</span>
            </h1>
            <p className="mt-7 text-lg leading-relaxed text-ink-900 max-w-[32rem] font-medium">
              Séjours, dîners, bons d&apos;achat : nos hôtels et agences partenaires vous offrent des lots à gagner en quelques clics.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#jeux" className="btn-game-pop h-14 px-8 text-lg">
                Voir les jeux <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
              <a href="#comment-ca-marche" className="inline-flex h-14 items-center px-5 rounded-full text-base font-bold text-ink-900 hover:bg-white/30 transition-colors whitespace-nowrap">
                Comment ça marche
              </a>
            </div>
          </div>

          <div className="min-w-0 flex justify-center">
            {siteSettings.hasHeroVideo ? (
              <figure className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden bg-ink-900 shadow-[0_0_0_6px_var(--ambre-400),var(--shadow-premium-lg)]">
                <video
                  ref={heroVideoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  <source src="/api/media/hero-video" type={siteSettings.heroVideoMimeType || 'video/mp4'} />
                </video>
                <button
                  type="button"
                  onClick={toggleVideoSound}
                  aria-label={isVideoMuted ? 'Activer le son de la vidéo' : 'Couper le son de la vidéo'}
                  className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-ink-900/75 hover:bg-ink-900 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </figure>
            ) : (
              <div className="relative w-[min(72%,260px)] sm:w-[min(100%,360px)]" aria-hidden="true">
                <span className="absolute left-1/2 -top-5 z-10 -translate-x-1/2 h-0 w-0 border-x-[16px] border-x-transparent border-t-[26px] border-t-ambre-400 drop-shadow-[0_3px_0_var(--ambre-700)]" />
                <div className="deco-wheel w-full" />
                <span className="absolute inset-0 m-auto h-[22%] w-[22%] rounded-full bg-ink-900 shadow-[0_0_0_6px_var(--ambre-400)] flex items-center justify-center font-display text-lg font-semibold text-white">
                  GO
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bord ondulé vers le fond crème */}
        <svg aria-hidden="true" className="absolute bottom-0 left-0 w-full h-10 sm:h-14 text-paper" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path fill="currentColor" d="M0 48 C 240 8 480 8 720 40 C 960 72 1200 72 1440 32 L1440 80 L0 80 Z" />
        </svg>
      </section>

      {/* LOTS À GAGNER — vrais lots, cartes colorées */}
      {featuredPrizes.length > 0 && (
        <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 -mt-2 pt-8">
          <h2 className="text-2xl sm:text-3xl">À gagner en ce moment</h2>
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredPrizes.map(({ prize, campaign }, i) => {
              const href = campaignHref(campaign)
              const tone = PRIZE_TONES[i % PRIZE_TONES.length]
              const body = (
                <>
                  <span className={`h-11 w-11 rounded-2xl flex items-center justify-center ${tone.icon}`} aria-hidden="true">
                    <Gift className="h-5 w-5" />
                  </span>
                  <span className="mt-4 block font-display text-xl font-semibold leading-tight text-ink-900 line-clamp-2">{prize.name}</span>
                  <span className="mt-1.5 block text-sm text-ink-700 truncate">{campaign.partner?.name || 'Obooking'}</span>
                </>
              )
              return (
                <li key={prize.id} className="min-w-0">
                  {href ? (
                    <Link href={href} className={`block h-full rounded-[22px] p-5 transition-transform duration-200 hover:-translate-y-1 ${tone.card}`}>{body}</Link>
                  ) : (
                    <div className={`h-full rounded-[22px] p-5 ${tone.card}`}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* CATALOGUE */}
      <section id="jeux" className="scroll-mt-20 max-w-6xl w-full mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl">Jeux en cours</h2>
            <p className="text-sm text-ink-500 mt-1">
              {filteredCampaigns.length} résultat{filteredCampaigns.length > 1 ? 's' : ''}
              {searchQuery.trim() ? ` pour « ${searchQuery.trim()} »` : ''}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              placeholder="Hôtel, destination, lot…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher un jeu-concours"
              className="w-full h-12 pl-10 pr-4 bg-surface border-2 border-field hover:border-ink-700 rounded-full text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
            />
          </div>
        </div>

        {filteredCampaigns.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredCampaigns.map((campaign) => {
              const isDraw = campaign.gameMode === 'DRAW'
              const ModeIcon = isDraw ? Ticket : Disc3
              const countdown = getCountdownInfo(campaign.endDate)
              const href = campaignHref(campaign)
              const prizes = campaign.prizes.filter((p) => p.totalStock !== -1)
              const shownPrizes = (prizes.length > 0 ? prizes : campaign.prizes).slice(0, 2)
              const extra = (prizes.length > 0 ? prizes : campaign.prizes).length - shownPrizes.length

              return (
                <li key={campaign.id} className="min-w-0">
                  <article className="group h-full flex flex-col rounded-[22px] bg-surface overflow-hidden shadow-[0_0_0_1px_var(--rule),var(--shadow-premium-md)] transition-transform duration-200 hover:-translate-y-1">
                    <div className={`relative overflow-hidden ${campaign.imageData ? 'aspect-[16/9]' : 'h-28'} ${isDraw ? 'bg-lagon-300' : 'bg-brand-100'}`}>
                      {campaign.imageData ? (
                        <img
                          src={`data:${campaign.imageMimeType || 'image/jpeg'};base64,${campaign.imageData}`}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className={`absolute -right-4 -bottom-6 ${isDraw ? 'text-lagon-600' : 'text-brand-400'}`} aria-hidden="true">
                          <ModeIcon className="h-32 w-32" strokeWidth={1.25} />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-ink-900 text-xs font-semibold text-white">
                        <ModeIcon className="h-3 w-3" aria-hidden="true" />
                        {isDraw ? 'Tirage au sort' : 'Roulette'}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <p className="text-[13px] font-semibold text-brand-700 truncate">{campaign.partner?.name || 'Obooking'}</p>
                      <h3 className="mt-1 text-xl leading-tight line-clamp-2">{campaign.title}</h3>

                      {shownPrizes.length > 0 && (
                        <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
                          {shownPrizes.map((prize) => (
                            <li key={prize.id} className="flex items-center gap-2 min-w-0">
                              <Gift className="h-3.5 w-3.5 text-brand-600 shrink-0" aria-hidden="true" />
                              <span className="truncate">{prize.name}</span>
                            </li>
                          ))}
                          {extra > 0 && <li className="text-[13px] text-ink-500 pl-5.5">et {extra} autre{extra > 1 ? 's' : ''} lot{extra > 1 ? 's' : ''}</li>}
                        </ul>
                      )}

                      <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap ${countdown.urgent ? 'bg-brand-50 text-brand-700' : 'bg-paper-2 text-ink-700'}`}>
                          {countdown.label}
                        </span>
                        {href ? (
                          <Link
                            href={href}
                            className="btn-game h-10 px-5 text-sm"
                            aria-label={`Participer à ${campaign.title}`}
                          >
                            Participer <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          <span className="text-[13px] text-ink-500 whitespace-nowrap">Bientôt disponible</span>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-rule-strong py-16 px-6 text-center">
            <p className="text-[15px] font-medium">Aucun jeu ne correspond à « {searchQuery.trim()} »</p>
            <p className="text-sm text-ink-500 mt-1">Essayez un nom d&apos;hôtel, une destination ou un type de lot.</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-5 inline-flex h-9 items-center px-4 rounded-full border border-rule-strong bg-surface text-sm font-medium hover:bg-paper-2 transition-colors cursor-pointer"
            >
              Effacer la recherche
            </button>
          </div>
        )}
      </section>

      {promoBanners.length > 0 && <PromoCarousel banners={promoBanners} />}

      <section id="comment-ca-marche" className="scroll-mt-20 bg-paper-2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl">Comment ça marche</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-700 max-w-sm">
              Trois étapes, sans compte obligatoire. Le tirage est calculé côté serveur pour être équitable.
            </p>
          </div>
          <HowItWorksTimeline />
        </div>
      </section>

      <footer className="border-t border-rule mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-ink-500">
          <span className="flex items-center gap-2">
            <span className="font-medium text-ink-900">Obooking Gift</span>
            <span aria-hidden="true">·</span>
            Jeux-concours des partenaires Obooking
          </span>
          <span className="flex items-center gap-4">
            <Link href="/client" className="hover:text-ink-900 transition-colors whitespace-nowrap">Espace client</Link>
            <Link href="/partner" className="hover:text-ink-900 transition-colors whitespace-nowrap">Espace partenaire</Link>
            <span className="whitespace-nowrap">© {new Date().getFullYear()}</span>
          </span>
        </div>
      </footer>
    </main>
  )
}
