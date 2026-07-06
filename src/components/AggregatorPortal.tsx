'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import {
  Search,
  Gift,
  Trophy,
  Calendar,
  Sparkles,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Tag,
  Zap,
  Users,
  Building2,
  ExternalLink,
  Plane,
  Bed,
  Ticket,
  ChevronDown,
  Volume2,
  VolumeX
} from 'lucide-react'
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
  heroVideoData: string | null
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

  // Header floats transparent over the hero video, then turns opaque once
  // the user has scrolled past it (so text stays readable over regular content).
  const heroRef = useRef<HTMLElement>(null)
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false)

  // Hero video starts muted (required for autoplay in every browser) — visitor can unmute it themselves.
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const toggleVideoSound = () => {
    if (!heroVideoRef.current) return
    heroVideoRef.current.muted = !heroVideoRef.current.muted
    setIsVideoMuted(heroVideoRef.current.muted)
  }

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = heroRef.current?.offsetHeight ?? 0
      setIsScrolledPastHero(window.scrollY > heroHeight - 80)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Light parallax on the hero media — moves slightly slower than the page scroll.
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroParallaxY = useTransform(heroScrollProgress, [0, 1], prefersReducedMotion ? ['0%', '0%'] : ['0%', '18%'])

  // Helper to resolve partner slug
  const getPartnerSlug = (name: string) => {
    return name.toLowerCase().trim().replace(/\s+/g, '-')
  }

  // Helper to categorize campaigns dynamically based on title/prizes
  const getCampaignCategory = (campaign: Campaign): string => {
    const textToSearch = (campaign.title + ' ' + campaign.prizes.map(p => p.name).join(' ')).toLowerCase()
    if (
      textToSearch.includes('omra') || 
      textToSearch.includes('makkah') || 
      textToSearch.includes('madinah')
    ) {
      return 'Omra'
    }
    if (
      textToSearch.includes('voyage') || 
      textToSearch.includes('circuit') || 
      textToSearch.includes('organisé') ||
      textToSearch.includes('vol') ||
      textToSearch.includes('zanzibar') ||
      textToSearch.includes('maldives')
    ) {
      return 'Voyages & Circuits'
    }
    if (
      textToSearch.includes('séjour') || 
      textToSearch.includes('hotel') || 
      textToSearch.includes('hôtel') || 
      textToSearch.includes('nuit') ||
      textToSearch.includes('djerba')
    ) {
      return 'Hôtels & Séjours'
    }
    if (
      textToSearch.includes('bon') || 
      textToSearch.includes('carte cadeau') || 
      textToSearch.includes('réduction') || 
      textToSearch.includes('remise') || 
      textToSearch.includes('tnd') || 
      textToSearch.includes('€') || 
      textToSearch.includes('euros')
    ) {
      return 'Bons de Réduction'
    }
    return 'Autres Cadeaux'
  }

  // Ticks once a minute so the "time left" badges below stay fresh — purely a
  // front-end display computed from the endDate the API already returns.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const getCountdownInfo = (endDate: string) => {
    const diffMs = new Date(endDate).getTime() - now
    if (diffMs <= 0) {
      return { label: 'Terminé', className: 'text-slate-400 bg-slate-100 border-slate-200' }
    }
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffHours / 24
    if (diffHours < 48) {
      return { label: `${Math.max(1, Math.ceil(diffHours))} h restantes`, className: 'text-red-600 bg-red-50 border-red-100' }
    }
    if (diffDays < 7) {
      return { label: `${Math.ceil(diffDays)} j restants`, className: 'text-orange-600 bg-orange-50 border-orange-100' }
    }
    return { label: `${Math.ceil(diffDays)} j restants`, className: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
  }

  // Filter campaigns (category filtering removed — kept the search-only match)
  const filteredCampaigns = useMemo(() => {
    return initialCampaigns.filter(campaign => {
      const matchesSearch =
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.partner?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.prizes.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesSearch
    })
  }, [initialCampaigns, searchQuery])

  return (
    <main className="min-h-screen text-slate-800 flex flex-col font-sans">
      {/* HEADER NAVBAR — floats transparent over the hero video, turns opaque past it.
          Sequenced arrival on load: header → hero → search → first card row. */}
      <motion.header
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-in-out ${
          isScrolledPastHero ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        {/* Fine gradient border, only visible once opaque */}
        <div
          className={`absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF8C00]/50 to-transparent transition-opacity duration-300 ${
            isScrolledPastHero ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/obooking-logo.png"
              alt="Obooking Gift"
              width={140}
              height={64}
              className={`h-8 md:h-9 w-auto object-contain transition-all duration-300 ${
                isScrolledPastHero ? '' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]'
              }`}
              priority
            />
            <span
              className={`font-black tracking-tight text-lg transition-colors duration-300 ${
                isScrolledPastHero ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]'
              }`}
            >
              Obooking Gift
            </span>
          </div>

          <div
            className={`hidden md:flex items-center gap-6 text-sm font-semibold transition-colors duration-300 ${
              isScrolledPastHero ? 'text-slate-550' : 'text-white/90'
            }`}
          >
            <Link
              href="/"
              className={`nav-link-underline relative py-1 ${isScrolledPastHero ? 'text-[#FF8C00] hover:text-[#e07b00]' : 'hover:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]'}`}
            >
              Explorer
            </Link>
            <a
              href="#how-it-works"
              className={`nav-link-underline relative py-1 transition-colors ${isScrolledPastHero ? 'hover:text-slate-800' : 'hover:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]'}`}
            >
              Comment ça marche
            </a>
          </div>

          {isAdminConnected && (
            <div className="flex items-center gap-3">
              <Link
                href="/partner"
                className={`cta-flash group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer overflow-hidden ${
                  isScrolledPastHero
                    ? 'border border-slate-200 hover:border-orange-200 hover:bg-orange-50/50 text-slate-700'
                    : 'border border-white/40 hover:border-white text-white bg-white/10 backdrop-blur-sm hover:bg-white/20'
                }`}
              >
                <span className="btn-shine absolute inset-0 pointer-events-none" aria-hidden="true" />
                <Building2 className="h-4 w-4 relative transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" /> <span className="relative">Espace Partenaire</span>
              </Link>
            </div>
          )}
        </div>
      </motion.header>

      {/* HERO VIDEO SECTION — full-screen on desktop; shorter on mobile so a landscape
          video/poster isn't crushed into a very tall/narrow phone viewport and cropped
          into an unreadable sliver by object-cover. */}
      <motion.section
        ref={heroRef}
        initial={prefersReducedMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="relative w-full overflow-hidden bg-brand-navy h-[46vh] min-h-[320px] md:h-screen"
      >
        {/* Parallax layer — slightly oversized so translating it never reveals empty edges */}
        <motion.div className="absolute inset-x-0 -top-[10%] h-[120%]" style={{ y: heroParallaxY }}>
          {siteSettings.heroVideoData ? (
            <video
              ref={heroVideoRef}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            >
              <source
                src={`data:${siteSettings.heroVideoMimeType || 'video/mp4'};base64,${siteSettings.heroVideoData}`}
                type={siteSettings.heroVideoMimeType || 'video/mp4'}
              />
            </video>
          ) : (
            <div className="absolute inset-0 bg-gradient-brand" />
          )}
        </motion.div>

        {/* Gradient overlay: transparent at top (lets the header float over crisp footage) → deep at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/15 to-black/50 pointer-events-none" />

        {/* Sound toggle — video autoplays muted (browser requirement), visitor can turn it on */}
        {siteSettings.heroVideoData && (
          <button
            type="button"
            onClick={toggleVideoSound}
            aria-label={isVideoMuted ? 'Activer le son de la vidéo' : 'Couper le son de la vidéo'}
            className="absolute bottom-6 right-4 sm:right-6 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            {isVideoMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
          </button>
        )}

        {/* Animated scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/70"
          animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <ChevronDown className="h-7 w-7" />
        </motion.div>
      </motion.section>

      {/* SEARCH BAR — sits below the hero video */}
      <motion.section
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 border-b border-slate-200/60 py-6 md:py-8">
        <div className="max-w-xl mx-auto px-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un voyage, un hôtel, une destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher un jeu-concours"
              className="w-full pl-13 pr-4 py-4 bg-white border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-450 focus:outline-hidden focus:border-[#FF8C00] focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-sm"
              style={{ boxShadow: 'var(--shadow-premium-md)' }}
            />
          </div>
        </div>
      </motion.section>

      {/* FILTER & CONTENT DIVISION */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Category & Type Filters Nav */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-xl text-xs font-black shrink-0 bg-[#FF8C00] text-white shadow-md shadow-orange-500/15 cursor-default">
              Tous
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] bg-white/20 text-white">
                {initialCampaigns.length}
              </span>
            </button>
          </div>
        </div>

        {/* RESULTS TEXT */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-slate-500 font-bold">
            Nous avons trouvé <span className="text-slate-800 font-extrabold">{filteredCampaigns.length}</span> jeux-concours actifs
          </p>
        </div>

        {/* CONTESTS GRID */}
        {filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign, cardIndex) => {
              const hasDraw = campaign.gameMode === 'DRAW'
              const firstPrize = campaign.prizes[0]
              const cat = getCampaignCategory(campaign)

              const countdown = getCountdownInfo(campaign.endDate)

              return (
                <motion.div
                  key={campaign.id}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.02 }}
                  transition={{ duration: 0.35, delay: 0.65 + Math.min(cardIndex, 7) * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  onMouseMove={(e) => {
                    const card = e.currentTarget
                    const rect = card.getBoundingClientRect()
                    card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
                    card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
                  }}
                  className="relative bg-white border border-slate-200/80 rounded-3xl flex flex-col justify-between overflow-hidden group"
                  style={{ boxShadow: 'var(--shadow-premium-md)' }}
                >
                  {/* Spotlight — follows the cursor, desktop only (see .spotlight-layer) */}
                  <div className="spotlight-layer absolute inset-0 z-10 pointer-events-none" aria-hidden="true" />

                  {/* Card Header Image / Icon Overlay */}
                  <div className={`relative flex items-center justify-center min-h-[120px] border-b border-slate-100 overflow-hidden ${
                    campaign.imageData ? '' : 'p-5 bg-gradient-to-br from-slate-50 to-slate-100/40'
                  }`}>
                    {campaign.imageData && (
                      <img
                        src={`data:${campaign.imageMimeType || 'image/jpeg'};base64,${campaign.imageData}`}
                        alt={campaign.title}
                        className="absolute inset-0 w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        hasDraw
                          ? 'bg-brand-navy/90 text-white border border-white/10'
                          : 'bg-gradient-gold-shine animate-shine text-white shadow-sm'
                      }`}>
                        {hasDraw ? 'Tirage au sort' : 'Instant Gagnant'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-200/50 text-[9px] text-slate-500 font-bold flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" /> {cat}
                      </span>
                    </div>

                    {/* Central Icon representation (fallback when no campaign image) */}
                    {!campaign.imageData && (
                      <div className="h-14 w-14 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-650 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                        {cat === 'Voyages & Circuits' && <Plane className="h-7 w-7 text-sky-500" />}
                        {cat === 'Hôtels & Séjours' && <Bed className="h-7 w-7 text-emerald-500" />}
                        {cat === 'Omra' && <Compass className="h-7 w-7 text-indigo-500" />}
                        {cat === 'Bons de Réduction' && <Ticket className="h-7 w-7 text-amber-500" />}
                        {cat === 'Autres Cadeaux' && <Gift className="h-7 w-7 text-[#FF8C00]" />}
                      </div>
                    )}
                  </div>

                  {/* Card Content details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Organizer Name */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="h-5 w-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-[9px] uppercase">
                          {campaign.partner?.name.slice(0, 2) || 'OB'}
                        </div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                          {campaign.partner?.name || 'Obooking'}
                        </span>
                      </div>

                      {/* Campaign Title */}
                      <h4 className="text-sm font-extrabold text-slate-800 group-hover:text-[#FF8C00] transition-colors leading-tight line-clamp-2">
                        {campaign.title}
                      </h4>

                      {/* Prizes preview list */}
                      <div className="mt-3.5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-450 block">Dotations à gagner :</span>
                        {campaign.prizes.slice(0, 2).map((prize) => (
                          <div key={prize.id} className="flex items-center gap-1 text-slate-600 text-xs">
                            <Gift className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate font-semibold text-xxs">{prize.name}</span>
                          </div>
                        ))}
                        {campaign.prizes.length > 2 && (
                          <span className="text-[10px] text-[#FF8C00] font-bold block mt-1">
                            + {campaign.prizes.length - 2} autre(s) lot(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-450 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Expire le {new Date(campaign.endDate).toLocaleDateString('fr-FR')}
                        </span>
                        <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-md text-[9px] font-black border ${countdown.className}`}>
                          {countdown.label}
                        </span>
                      </div>

                      {campaign.partner ? (
                        <Link
                          href={`/company/${getPartnerSlug(campaign.partner.name)}`}
                          className="cta-flash bg-gradient-brand relative inline-flex items-center gap-1 px-3 py-2 text-white rounded-lg text-xxs font-black tracking-tight transition-all hover:brightness-110 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                          style={{ boxShadow: 'var(--shadow-premium-glow)' }}
                        >
                          <span className="absolute inset-0 rounded-lg animate-ping-slow bg-[#FF8C00]/60 motion-reduce:hidden" aria-hidden="true" />
                          <span className="relative flex items-center gap-1">
                            Jouer <ArrowUpRight className="h-3.5 w-3.5" />
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xxs text-slate-400 font-semibold shrink-0">Bientôt disponible</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto" style={{ boxShadow: 'var(--shadow-premium-sm)' }}>
            <Gift className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-black text-slate-800">Aucun jeu-concours trouvé</h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Il n'y a pas de concours correspondant à vos critères de recherche en ce moment. Essayez d'autres filtres.
            </p>
          </div>
        )}
      </section>

      {/* PROMO BANNERS MARQUEE — admin-managed, dynamic */}
      <PromoCarousel banners={promoBanners} />

      {/* HOW IT WORKS INFO SECTION — the one deliberately dark beat in the page's
          scroll rhythm (everything else on this page is light) */}
      <section id="how-it-works" className="relative z-10 bg-brand-navy py-16 sm:py-24 mt-20 scroll-mt-20 overflow-hidden">
        {/* Same dot-grid + ambient glow language as the footer, for visual consistency between the two dark sections */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[420px] bg-[radial-gradient(ellipse_at_center,var(--color-brand-orange)_0%,transparent_70%)] opacity-10 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Comment ça <span className="text-gradient-brand">marche</span> ?
            </h2>
            <p className="text-slate-400 text-xs mt-3 font-semibold">
              Participez en quelques clics et tentez de gagner vos prochaines vacances de rêve avec Obooking.
            </p>
          </div>

          <HowItWorksTimeline />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative bg-brand-navy text-slate-300 overflow-hidden mt-auto">
        {/* Subtle dot-grid pattern for texture */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -top-24 right-0 w-[420px] h-[420px] bg-[radial-gradient(ellipse_at_center,var(--color-brand-orange)_0%,transparent_70%)] opacity-10 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {/* Logo + baseline */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image
                  src="/obooking-logo.png"
                  alt="Obooking Gift"
                  width={120}
                  height={55}
                  className="h-8 w-auto object-contain brightness-0 invert"
                />
                <span className="font-display text-white font-semibold text-lg">Obooking Gift</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                Voyages de rêve, séjours de luxe et bons d'achat exclusifs à gagner — tentez votre chance dès maintenant.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h5 className="text-white text-xs font-black uppercase tracking-wider mb-4">Liens rapides</h5>
              <ul className="space-y-2.5 text-xs">
                <li><Link href="/" className="hover:text-white transition-colors">Explorer les campagnes</Link></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Comment ça marche</a></li>
                <li><Link href="/partner" className="hover:text-white transition-colors">Espace Partenaire</Link></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h5 className="text-white text-xs font-black uppercase tracking-wider mb-4">Suivez-nous</h5>
              <div className="flex items-center gap-3">
                <a
                  href="#"
                  aria-label="Obooking Gift sur Facebook"
                  className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#FF8C00] hover:border-[#FF8C00] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  aria-label="Obooking Gift sur Instagram"
                  className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#FF8C00] hover:border-[#FF8C00] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Gradient separator */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent my-8" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>Plateforme sécurisée &copy; {new Date().getFullYear()} Obooking Contests. Tous droits réservés.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Simple Clock component wrapper to replace Lucide Clock if missing
function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// Minimal brand icons for the footer's social row (lucide-react has no brand icon set)
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H17V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.6V13h2.7v8h3.2Z" />
    </svg>
  )
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}
