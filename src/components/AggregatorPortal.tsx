'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Gift, Volume2, VolumeX } from 'lucide-react'
import { SkyScene } from './aviation/SkyScene'
import { DepartureBoard, type DepartureRow } from './aviation/DepartureBoard'
import { BoardingPass } from './aviation/BoardingPass'
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
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Anciens liens construits depuis le nom ; le slug est préféré quand il existe.
  const getPartnerSlug = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '-')

  // Ticks once a minute so the "time left" values stay fresh — purely a
  // front-end display computed from the endDate the API already returns.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return initialCampaigns
    return initialCampaigns.filter((campaign) =>
      campaign.title.toLowerCase().includes(q) ||
      campaign.partner?.name.toLowerCase().includes(q) ||
      campaign.prizes.some((p) => p.name.toLowerCase().includes(q))
    )
  }, [initialCampaigns, searchQuery])

  const campaignHref = (campaign: Campaign) =>
    campaign.partner ? `/company/${campaign.partner.slug || getPartnerSlug(campaign.partner.name)}` : null

  // Tableau des départs : les 4 jeux en cours qui se terminent le plus tôt.
  const departures: DepartureRow[] = useMemo(
    () =>
      initialCampaigns
        .filter((c) => new Date(c.endDate).getTime() > now)
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          title: c.title,
          partnerName: c.partner?.name || 'Obooking',
          mode: c.gameMode,
          endDate: c.endDate,
          href: campaignHref(c),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialCampaigns, now]
  )

  const overHero = !isScrolled

  return (
    <main className="min-h-screen flex flex-col bg-paper text-ink-900">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
          overHero ? 'bg-transparent' : 'bg-paper/95 shadow-[0_1px_0_var(--rule)]'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <span className="h-9 px-2 rounded-xl flex items-center bg-white">
              <Image src="/obooking-logo.png" alt="" width={140} height={64} className="h-6 w-auto object-contain" priority />
            </span>
            <span className={`font-display text-lg font-semibold whitespace-nowrap ${overHero ? 'text-white' : 'text-ink-900'}`}>Obooking Gift</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-semibold" aria-label="Navigation">
            <a href="#jeux" className={`hidden sm:inline-flex h-9 items-center px-3 rounded-full transition-colors whitespace-nowrap ${overHero ? 'text-white hover:bg-white/15' : 'text-ink-700 hover:bg-black/[0.05]'}`}>
              Jeux en cours
            </a>
            <a href="#itineraire" className={`hidden md:inline-flex h-9 items-center px-3 rounded-full transition-colors whitespace-nowrap ${overHero ? 'text-white hover:bg-white/15' : 'text-ink-700 hover:bg-black/[0.05]'}`}>
              Comment ça marche
            </a>
            <Link href={isAdminConnected ? '/partner' : '/client'} className={`${overHero ? 'btn-game-pop' : 'btn-game'} h-10 px-4 text-sm`}>
              {isAdminConnected ? 'Mon tableau de bord' : 'Mon espace'}
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO — vidéo plein écran (configurée dans le back-office) ou ciel animé */}
      <section className="relative min-h-[92svh] flex flex-col justify-end overflow-hidden bg-ink-900 text-white">
        {siteSettings.hasHeroVideo ? (
          <>
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
            {/* Voile pour la lisibilité du texte et du tableau posés sur la vidéo */}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--ink-900)_6%,oklch(26%_0.055_265/0.62)_40%,oklch(26%_0.055_265/0.42)_72%,oklch(26%_0.055_265/0.72))]" aria-hidden="true" />
          </>
        ) : (
          <SkyScene />
        )}

        <div className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 pt-32 pb-10 sm:pb-14">
          <h1 className="max-w-[14ch] text-[clamp(2.75rem,7.5vw,6rem)] leading-[0.95] font-semibold [overflow-wrap:anywhere]">
            Votre prochain voyage commence par un jeu
          </h1>
          <p className="mt-6 max-w-[38rem] text-lg sm:text-xl leading-relaxed text-white/85">
            Séjours, dîners et bons d&apos;achat offerts par les hôtels et agences partenaires d&apos;Obooking.
            Inscrivez-vous, tournez la roue ou tentez le tirage au sort.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="#jeux" className="btn-game h-14 px-8 text-lg">Voir les jeux</a>
            {siteSettings.hasHeroVideo && (
              <button
                type="button"
                onClick={toggleVideoSound}
                aria-label={isVideoMuted ? 'Activer le son de la vidéo' : 'Couper le son de la vidéo'}
                className="inline-flex h-14 items-center gap-2 px-5 rounded-full text-base font-semibold text-white hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isVideoMuted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
                {isVideoMuted ? 'Activer le son' : 'Couper le son'}
              </button>
            )}
          </div>

          <div className="mt-12 sm:mt-16">
            <DepartureBoard rows={departures} now={now} />
          </div>
        </div>
      </section>

      {/* CATALOGUE — cartes d'embarquement */}
      <section id="jeux" className="scroll-mt-20 max-w-6xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <h2 className="text-4xl sm:text-5xl leading-none">Tous les jeux</h2>
            <p className="text-[15px] text-ink-700 mt-3">
              {filteredCampaigns.length} jeu{filteredCampaigns.length > 1 ? 'x' : ''}
              {searchQuery.trim() ? ` pour « ${searchQuery.trim()} »` : ' en cours chez nos partenaires'}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              placeholder="Hôtel, destination, lot…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher un jeu-concours"
              className="w-full h-12 pl-11 pr-4 bg-surface border-2 border-field hover:border-ink-700 rounded-full text-[15px] text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
            />
          </div>
        </div>

        {filteredCampaigns.length > 0 ? (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredCampaigns.map((campaign) => {
              const limited = campaign.prizes.filter((p) => p.totalStock !== -1)
              return (
                <li key={campaign.id} className="min-w-0">
                  <BoardingPass
                    title={campaign.title}
                    partnerName={campaign.partner?.name || 'Obooking'}
                    mode={campaign.gameMode}
                    startDate={campaign.startDate}
                    endDate={campaign.endDate}
                    prizes={(limited.length > 0 ? limited : campaign.prizes).map((p) => p.name)}
                    imageData={campaign.imageData}
                    imageMimeType={campaign.imageMimeType}
                    href={campaignHref(campaign)}
                    now={now}
                  />
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-[24px] border-2 border-dashed border-rule-strong py-16 px-6 text-center">
            <Gift className="h-8 w-8 text-ink-500 mx-auto" aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold">Aucun jeu ne correspond à « {searchQuery.trim()} »</p>
            <p className="text-[15px] text-ink-700 mt-1">Essayez un nom d&apos;hôtel, une destination ou un type de lot.</p>
            <button type="button" onClick={() => setSearchQuery('')} className="btn-game-light mt-6 h-11 px-5 text-sm">
              Effacer la recherche
            </button>
          </div>
        )}
      </section>

      {promoBanners.length > 0 && <PromoCarousel banners={promoBanners} />}

      <section id="itineraire" className="scroll-mt-20 bg-ink-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <h2 className="text-4xl sm:text-5xl leading-none text-white">Votre itinéraire</h2>
          <p className="mt-3 text-[15px] text-white/70 max-w-xl">
            Trois étapes, sans compte obligatoire. Le tirage est calculé côté serveur pour être équitable.
          </p>
          <HowItWorksTimeline />
        </div>
      </section>

      <footer className="bg-ink-900 border-t border-white/10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-white/60">
          <span>
            <span className="font-display text-base font-semibold text-white">Obooking Gift</span>
            <span className="ml-3">Les jeux-concours des partenaires Obooking</span>
          </span>
          <span className="flex items-center gap-5">
            <Link href="/client" className="hover:text-white transition-colors whitespace-nowrap">Espace client</Link>
            <Link href="/partner" className="hover:text-white transition-colors whitespace-nowrap">Espace partenaire</Link>
            <span className="whitespace-nowrap">© {new Date().getFullYear()}</span>
          </span>
        </div>
      </footer>
    </main>
  )
}
