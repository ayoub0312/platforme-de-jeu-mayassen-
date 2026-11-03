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
        className={`sticky top-0 z-50 bg-paper transition-[border-color] duration-150 border-b ${
          isScrolled ? 'border-rule' : 'border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Image src="/obooking-logo.png" alt="" width={140} height={64} className="h-7 w-auto object-contain" priority />
            <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">Obooking Gift</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm" aria-label="Navigation">
            <a href="#jeux" className="hidden sm:inline-flex h-9 items-center px-3 rounded-full text-ink-700 hover:text-ink-900 hover:bg-black/[0.04] transition-colors whitespace-nowrap">
              Jeux en cours
            </a>
            <a href="#comment-ca-marche" className="hidden md:inline-flex h-9 items-center px-3 rounded-full text-ink-700 hover:text-ink-900 hover:bg-black/[0.04] transition-colors whitespace-nowrap">
              Comment ça marche
            </a>
            <Link
              href={isAdminConnected ? '/partner' : '/client'}
              className="inline-flex h-9 items-center px-4 rounded-full border border-rule-strong bg-surface text-ink-900 font-medium hover:bg-paper-2 transition-colors whitespace-nowrap"
            >
              {isAdminConnected ? 'Mon tableau de bord' : 'Mon espace'}
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO — titre à gauche, média ou lots réels à droite */}
      <section className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-24 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
          <div className="min-w-0">
            <h1 className="text-[clamp(2.25rem,4.6vw,3.5rem)] leading-[1.04] font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]">
              Jouez, et gagnez votre prochain voyage.
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-700 max-w-[34rem]">
              Roulettes et tirages au sort offerts par nos hôtels et agences partenaires.
              {initialCampaigns.length > 0 && (
                <> En ce moment, <strong className="font-semibold text-ink-900">{initialCampaigns.length} jeu{initialCampaigns.length > 1 ? 'x' : ''}</strong> chez{' '}
                  <strong className="font-semibold text-ink-900">{partnerCount} partenaire{partnerCount > 1 ? 's' : ''}</strong>.</>
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#jeux" className="inline-flex h-12 items-center gap-2 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold transition-colors whitespace-nowrap">
                Voir les jeux en cours <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#comment-ca-marche" className="inline-flex h-12 items-center px-5 rounded-full text-[15px] font-medium text-ink-900 hover:bg-black/[0.04] transition-colors whitespace-nowrap">
                Comment ça marche
              </a>
            </div>
          </div>

          <div className="min-w-0">
            {siteSettings.hasHeroVideo ? (
              <figure className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-rule bg-ink-900">
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
                  className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-ink-900/70 hover:bg-ink-900 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </figure>
            ) : featuredPrizes.length > 0 ? (
              <div className="rounded-2xl border border-rule bg-surface" style={{ boxShadow: 'var(--shadow-premium-md)' }}>
                <p className="px-5 pt-5 pb-3 text-[13px] font-medium text-ink-500">À gagner en ce moment</p>
                <ul className="divide-y divide-rule">
                  {featuredPrizes.map(({ prize, campaign }) => {
                    const href = campaignHref(campaign)
                    const row = (
                      <>
                        <span className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden="true">
                          <Gift className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium text-ink-900 truncate">{prize.name}</span>
                          <span className="block text-[13px] text-ink-500 truncate">{campaign.partner?.name || 'Obooking'} · {campaign.title}</span>
                        </span>
                        {href && <ArrowRight className="h-4 w-4 text-ink-500 shrink-0 group-hover:text-ink-900 transition-colors" aria-hidden="true" />}
                      </>
                    )
                    return (
                      <li key={prize.id}>
                        {href ? (
                          <Link href={href} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-paper transition-colors">{row}</Link>
                        ) : (
                          <div className="flex items-center gap-3 px-5 py-3.5">{row}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* CATALOGUE */}
      <section id="jeux" className="scroll-mt-20 max-w-6xl w-full mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight">Jeux en cours</h2>
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
              className="w-full h-11 pl-10 pr-4 bg-surface border border-field hover:border-ink-700 rounded-full text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
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
                  <article className="group h-full flex flex-col rounded-2xl border border-rule bg-surface overflow-hidden transition-colors duration-150 hover:border-rule-strong">
                    <div className={`relative bg-paper-2 border-b border-rule overflow-hidden ${campaign.imageData ? 'aspect-[16/9]' : 'h-24'}`}>
                      {campaign.imageData ? (
                        <img
                          src={`data:${campaign.imageMimeType || 'image/jpeg'};base64,${campaign.imageData}`}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-y-0 right-4 flex items-center text-ink-500/30" aria-hidden="true">
                          <ModeIcon className="h-12 w-12" strokeWidth={1} />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-surface text-xs font-medium text-ink-900 shadow-[0_0_0_1px_var(--rule)]">
                        <ModeIcon className="h-3 w-3" aria-hidden="true" />
                        {isDraw ? 'Tirage au sort' : 'Roulette'}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <p className="text-[13px] text-ink-500 truncate">{campaign.partner?.name || 'Obooking'}</p>
                      <h3 className="mt-1 text-[17px] font-semibold leading-snug tracking-tight line-clamp-2">{campaign.title}</h3>

                      {shownPrizes.length > 0 && (
                        <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
                          {shownPrizes.map((prize) => (
                            <li key={prize.id} className="flex items-center gap-2 min-w-0">
                              <Gift className="h-3.5 w-3.5 text-ink-500 shrink-0" aria-hidden="true" />
                              <span className="truncate">{prize.name}</span>
                            </li>
                          ))}
                          {extra > 0 && <li className="text-[13px] text-ink-500 pl-5.5">et {extra} autre{extra > 1 ? 's' : ''} lot{extra > 1 ? 's' : ''}</li>}
                        </ul>
                      )}

                      <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                        <span className={`text-[13px] whitespace-nowrap ${countdown.urgent ? 'text-brand-700 font-medium' : 'text-ink-500'}`}>
                          {countdown.label}
                        </span>
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex h-9 items-center gap-1.5 px-4 rounded-full bg-ink-900 hover:bg-slate-800 text-paper text-sm font-medium transition-colors whitespace-nowrap"
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

      <section id="comment-ca-marche" className="scroll-mt-20 border-t border-rule bg-paper-2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight">Comment ça marche</h2>
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
