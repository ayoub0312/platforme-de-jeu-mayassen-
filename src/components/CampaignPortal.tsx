'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import { LeadCaptureModal } from './LeadCaptureModal'
import { RouletteWheel } from './RouletteWheel'
import { 
  Sparkles, 
  Share2, 
  Play, 
  Gift, 
  HelpCircle, 
  CheckCircle,
  Copy,
  LogOut,
  Calendar,
  Layers,
  X,
  Trophy,
  ArrowRight,
  ChevronRight,
  QrCode,
  Info,
  Target,
  Upload,
  ArrowUpRight,
  Camera,
  Loader2,
  Home
} from 'lucide-react'

export function CampaignPortal({ initialCampaigns }: { initialCampaigns: any[] }) {
  const searchParams = useSearchParams()
  const referredByCode = searchParams.get('ref') || undefined

  const [activeTab, setActiveTab] = useState<'game' | 'prizes' | 'referral' | 'challenges'>('game')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  
  // Rotating Ads state
  const [activeAdIndex, setActiveAdIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAdIndex(prev => (prev + 1) % 3)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  // Player session states
  const [playerEmail, setPlayerEmail] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [spinsLeft, setSpinsLeft] = useState<number>(0)
  const [isCopied, setIsCopied] = useState(false)

  // Load active campaigns
  const { data: campaigns } = trpc.getCampaigns.useQuery(undefined, {
    initialData: initialCampaigns,
  })

  // Set active campaign
  const activeCampaignId = selectedCampaignId || (campaigns && campaigns.length > 0 ? campaigns[0].id : null)
  const activeCampaign = campaigns?.find(c => c.id === activeCampaignId)

  // Player info loader
  const { data: playerInfo, refetch: refetchPlayer } = trpc.getPlayerInfo.useQuery(
    { 
      email: playerEmail || '', 
      campaignId: activeCampaignId || '' 
    },
    { 
      enabled: !!playerEmail && !!activeCampaignId 
    }
  )
  
  // Challenges states
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  
  // tRPC mutation for claiming tasks
  const claimTaskMutation = trpc.claimTaskToken.useMutation()
  const leadMutation = trpc.captureLead.useMutation()

  const handleVisitWebsite = () => {
    if (!activeCampaign) return
    if (playerInfo?.completedTasks?.includes('VISIT_WEBSITE')) return
    window.open('https://obooking.com', '_blank')
    claimTaskMutation.mutate(
      {
        email: playerEmail || '',
        campaignId: activeCampaign.id,
        taskType: 'VISIT_WEBSITE',
      },
      {
        onSuccess: (data) => {
          refetchPlayer()
          alert(data.message)
        },
        onError: (err) => {
          alert(err.message)
        }
      }
    )
  }

  const handleFollowSocial = () => {
    if (!activeCampaign) return
    if (playerInfo?.completedTasks?.includes('FOLLOW_SOCIAL')) return
    window.open('https://instagram.com/obooking', '_blank')
    claimTaskMutation.mutate(
      {
        email: playerEmail || '',
        campaignId: activeCampaign.id,
        taskType: 'FOLLOW_SOCIAL',
      },
      {
        onSuccess: (data) => {
          refetchPlayer()
          alert(data.message)
        },
        onError: (err) => {
          alert(err.message)
        }
      }
    )
  }

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeCampaign) return
    if (playerInfo?.completedTasks?.includes('RECEIPT_UPLOAD')) return
    if (!e.target.files || e.target.files.length === 0) return

    setUploadingReceipt(true)
    setTimeout(() => {
      claimTaskMutation.mutate(
        {
          email: playerEmail || '',
          campaignId: activeCampaign.id,
          taskType: 'RECEIPT_UPLOAD',
        },
        {
          onSuccess: (data) => {
            setUploadingReceipt(false)
            refetchPlayer()
            alert('Ticket analysé avec succès ! ' + data.message)
          },
          onError: (err) => {
            setUploadingReceipt(false)
            alert(err.message)
          }
        }
      )
    }, 2000)
  }

  // Load session from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('obooking_game_email')
      const storedName = localStorage.getItem('obooking_game_name')
      if (storedEmail && storedName) {
        setPlayerEmail(storedEmail)
        setPlayerName(storedName)
      }
    }
  }, [])

  // Sync spins
  useEffect(() => {
    if (playerInfo !== undefined) {
      setSpinsLeft(playerInfo.tokens)
    }
  }, [playerInfo])

  const handleLeadCaptureSuccess = (email: string, name: string, tokens: number) => {
    setPlayerEmail(email)
    setPlayerName(name)
    setSpinsLeft(tokens)
    setActiveTab('game')
    if (typeof window !== 'undefined') {
      localStorage.setItem('obooking_game_email', email)
      localStorage.setItem('obooking_game_name', name)
    }
  }

  const handleSpinSuccess = (prizeName: string, remainingSpins: number) => {
    setSpinsLeft(remainingSpins)
    refetchPlayer()
  }

  const handleCopyLink = () => {
    if (!playerInfo?.referralCode) return
    const link = `${window.location.origin}/?ref=${playerInfo.referralCode}`
    navigator.clipboard.writeText(link)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleSwitchCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    
    // Auto-register user for the new campaign in the background if they are already logged in
    if (playerEmail && playerName) {
      const targetCampaign = campaigns?.find(c => c.id === campaignId)
      if (targetCampaign) {
        leadMutation.mutate(
          {
            email: playerEmail,
            name: playerName,
            campaignId: campaignId,
            partnerId: targetCampaign.partnerId || '',
            source: 'LINK',
          },
          {
            onSuccess: (data) => {
              setSpinsLeft(data.tokensCount)
              setTimeout(() => {
                refetchPlayer()
              }, 100)
            }
          }
        )
      }
    }
  }

  const handleLogout = () => {
    setPlayerEmail(null)
    setPlayerName(null)
    setSpinsLeft(0)
    setActiveTab('game')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('obooking_game_email')
      localStorage.removeItem('obooking_game_name')
    }
  }

  if (!activeCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto px-4">
        <HelpCircle className="h-12 w-12 text-slate-300" />
        <h3 className="text-lg font-bold text-slate-700 mt-4">Aucune campagne active</h3>
        <p className="text-slate-400 text-sm mt-2">
          Il n'y a actuellement aucune campagne de loterie configurée. Veuillez repasser plus tard.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
      
      {/* 1. ROTATING HERO ADS BANNER */}
      <div className="w-full bg-gradient-to-br from-slate-950 via-[#0F0D22] to-slate-950 border border-slate-800 rounded-[32px] p-6 sm:p-8 text-left relative overflow-hidden shadow-2xl mb-10 group transition-all duration-500">
        {/* Decorative glowing backdrops */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/15 transition-all duration-700"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/15 transition-all duration-700"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[220px]">
          
          {/* Left side: Rotating Ads content */}
          <div className="lg:col-span-8 space-y-4">
            {activeAdIndex === 0 && (
              <div className="animate-fade-in space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/25 rounded-full text-[10px] font-black text-[#FF8C00] uppercase tracking-wider">
                  {activeCampaign.adBadge1 || "✈️ Partenaire Officiel Obooking Voyage"}
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                  {activeCampaign.adTitle1 ? (
                    activeCampaign.adTitle1
                  ) : (
                    <>
                      Évadez-vous aux <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8C00] to-[#E100C6]">Seychelles</span> avec -15%
                    </>
                  )}
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                  {activeCampaign.adDesc1 ? (
                    activeCampaign.adDesc1
                  ) : (
                    <>
                      Profitez de notre offre exclusive de saison en partenariat avec Obooking. Entrez le code promo <span className="text-[#FF8C00] font-mono font-bold bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/10">SEYCH15</span> lors de votre réservation et envolez-vous vers des plages de sable blanc d'exception.
                    </>
                  )}
                </p>
              </div>
            )}
            {activeAdIndex === 1 && (
              <div className="animate-fade-in space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/25 rounded-full text-[10px] font-black text-[#B066FF] uppercase tracking-wider">
                  {activeCampaign.adBadge2 || "🏝️ Grand Tirage au Sort"}
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                  {activeCampaign.adTitle2 ? (
                    activeCampaign.adTitle2
                  ) : (
                    <>
                      Gagnez un séjour de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B066FF] to-[#00F0FF]">Rêve aux Maldives !</span>
                    </>
                  )}
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                  {activeCampaign.adDesc2 || "Le grand prix de la roulette Obooking est un séjour complet de 5 jours tout compris pour 2 personnes dans un resort sur pilotis aux Maldives. Chaque défi complété augmente vos chances de l'obtenir !"}
                </p>
              </div>
            )}
            {activeAdIndex === 2 && (
              <div className="animate-fade-in space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-emerald-500/25 rounded-full text-[10px] font-black text-[#00E19B] uppercase tracking-wider">
                  {activeCampaign.adBadge3 || "🛒 Partenaire Tout est la"}
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                  {activeCampaign.adTitle3 ? (
                    activeCampaign.adTitle3
                  ) : (
                    <>
                      Faites vos achats et <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E19B] to-[#FFE600]">Gagnez des lancers !</span>
                    </>
                  )}
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                  {activeCampaign.adDesc3 || "Faites vos achats chez Tout est la, récupérez votre code QR de jeu ou téléchargez votre ticket de caisse dans l'onglet des défis pour débloquer immédiatement +5 spins bonus."}
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={activeCampaign.promoUrl || "https://obooking.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                Découvrir Obooking Voyage <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => {
                  if (playerEmail) {
                    setActiveTab('challenges')
                  } else {
                    // Smooth scroll to register/play area
                    const element = document.getElementById('play-zone')
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' })
                    } else {
                      window.scrollTo({ top: 400, behavior: 'smooth' })
                    }
                  }
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-755 text-slate-200 hover:text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                🎯 Relever les Défis
              </button>
            </div>
          </div>

          {/* Right side: Static Offer Details Card */}
          <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-full min-h-[160px] text-left backdrop-blur-sm">
            <div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PROMO FLASH DU MOMENT</span>
              <div className="text-sm font-extrabold text-white mt-1 flex items-center gap-1.5">
                {activeCampaign.promoTitle || "🌴 Seychelles Island Escape"} <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-semibold leading-relaxed">
                {activeCampaign.promoDesc ? (
                  <>
                    {activeCampaign.promoDesc} {activeCampaign.promoCode && (
                      <span className="text-[#FF8C00] font-mono font-bold bg-[#FF8C00]/10 px-1.5 py-0.5 rounded border border-[#FF8C00]/25 ml-1">
                        {activeCampaign.promoCode}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Voyagez à prix réduit vers les îles Seychelles avec le code promo exclusif d'Obooking : <span className="text-[#FF8C00] font-mono font-bold bg-[#FF8C00]/10 px-1.5 py-0.5 rounded border border-[#FF8C00]/25">SEYCH15</span>
                  </>
                )}
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-red-800/60 flex items-center justify-between">
              <a 
                href={activeCampaign.promoUrl || "https://obooking.com"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xxs font-black text-[#FF8C00] hover:text-white flex items-center gap-1 transition-colors"
              >
                RÉSERVER LE VOYAGE <ChevronRight className="h-3 w-3" />
              </a>
              
              {/* Slider Dots Indicator */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveAdIndex(idx)}
                    className={`h-2 w-2 rounded-full transition-all duration-300 cursor-pointer ${
                      activeAdIndex === idx ? 'bg-[#FF8C00] w-4' : 'bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. MAIN HUB GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl items-start">
        
        {/* LEFT COLUMN: ACTIVE DRAWS / KOR3A */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-850 flex items-center gap-2">
              🎰 Loteries Actives 
            </h3>
            <span className="px-2.5 py-1 bg-orange-50 border border-orange-100 rounded-full text-xxs font-black text-[#FF8C00]">
              {campaigns?.length || 0} Jeux
            </span>
          </div>

          <div className="space-y-4">
            {campaigns && campaigns.length > 0 ? (
              campaigns.map((c) => {
                const isActiveGame = c.id === activeCampaign.id
                const partnerName = c.partner?.name || 'Partenaire B2B'
                
                // Custom branding palettes per partner
                let brandBadge = 'bg-orange-50 text-orange-700 border-orange-100'
                let brandRing = 'border-orange-500 ring-orange-500/15'
                let textHighlight = 'text-[#FF8C00]'
                
                if (partnerName.toLowerCase().includes('obooking')) {
                  brandBadge = 'bg-orange-50 text-orange-700 border-orange-100'
                  brandRing = 'border-orange-500 ring-orange-500/15'
                  textHighlight = 'text-[#FF8C00]'
                } else if (partnerName.toLowerCase().includes('tout est la') || partnerName.toLowerCase().includes('tout')) {
                  brandBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  brandRing = 'border-emerald-500 ring-emerald-500/15'
                  textHighlight = 'text-emerald-600'
                }

                return (
                  <div 
                    key={c.id}
                    className={`bg-white border rounded-3xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                      isActiveGame 
                        ? `${brandRing} border-2 ring-1 scale-[1.01]` 
                        : 'border-slate-150 hover:border-slate-300'
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

                     <h4 className="font-extrabold text-sm text-slate-855 leading-snug line-clamp-1">{c.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Tentez de remporter l'un des {c.prizes.length} lots disponibles.</p>
                    
                    {/* Compact Scheduled Draw Info */}
                    {c.prizes.some(p => p.drawDate) && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col gap-1 shadow-sm">
                        <span className="text-[8px] font-black text-[#FF8C00] uppercase tracking-wider flex items-center gap-1">
                          ✨ Tirage Exceptionnel (Kor3a)
                        </span>
                        <div className="text-[10px] font-bold text-slate-700 leading-snug">
                          {c.prizes.filter(p => p.drawDate).map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-2">
                              <span>• {p.name}</span>
                              <span className="text-slate-400 text-xxs shrink-0 font-medium">Le {new Date(p.drawDate!).toLocaleDateString('fr-FR')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Compact Challenges List */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[10px] text-slate-550 font-bold">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">🎯 Défis de cette Kor3a :</span>
                      <div className="flex items-center gap-1.5">• ✈️ Visiter l'agence Obooking <span className={`font-black ${textHighlight}`}>+1 lancer</span></div>
                      <div className="flex items-center gap-1.5">• 📸 Suivre sur Instagram <span className={`font-black ${textHighlight}`}>+1 lancer</span></div>
                      <div className="flex items-center gap-1.5">• 🧾 Ticket caisse {partnerName} <span className="font-black text-emerald-600">+5 lancers</span></div>
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
                            className="px-3.5 py-2 bg-slate-900 hover:bg-[#1A1A1A] text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                          >
                            Jouer à ce jeu <ArrowRight className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-slate-400 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-semibold">
                Aucun tirage de loterie actif pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ROULETTE ARENA */}
        <div id="play-zone" className="lg:col-span-7 flex flex-col items-center ">
          
          <div className="w-full flex items-center justify-between px-2 mb-6">
            <h3 className="text-lg font-black text-slate-850 flex items-center gap-2">
              🎡 Zone de Jeu Loterie
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-100 rounded-full text-[10px] font-bold text-[#FF8C00]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF8C00] animate-pulse"></span>
              En direct de {activeCampaign.partner?.name || 'Loterie'}
            </div>
          </div>

          {/* Main Card Container */}
          <div className="w-full  bg-white border-none rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl">
            
            {/* Card Header for Authenticated Users */}
            {playerEmail && playerName && (
              <div className="px-6 py-4 border-none bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-[#FF8C00] font-extrabold text-sm uppercase">
                    {playerName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{playerName}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{playerEmail}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-650 hover:bg-red-50 rounded-lg text-xxs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" /> Quitter
                </button>
              </div>
            )}

            {/* Card Body */}
            <div className="p-6 sm:p-8 flex-1 bg-white">
              {!playerEmail || !playerName ? (
                /* Lead Capture form directly inline */
                <LeadCaptureModal
                  campaignId={activeCampaign.id}
                  partnerId={activeCampaign.partnerId || ''}
                  referredByCode={referredByCode}
                  onSuccess={handleLeadCaptureSuccess}
                />
              ) : (
                /* Authenticated game controls */
                <div className="flex flex-col items-center">
                  
                  {/* Internal horizontal tabs */}
                  <div className="hidden md:flex w-full items-center bg-slate-50/50 border border-slate-100 mb-6 p-1 rounded-2xl">
                    {[
                      { id: 'game', label: 'Lancer', icon: Play },
                      { id: 'challenges', label: 'Défis', icon: Target },
                      { id: 'prizes', label: 'Lots', icon: Trophy },
                      { id: 'referral', label: 'Parrainage', icon: Share2 }
                    ].map((t) => {
                      const Icon = t.icon
                      const isActive = activeTab === t.id
                      return (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id as any)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white text-[#FF8C00] border border-[#FF8C00] shadow-sm'
                              : 'text-slate-800 hover:text-slate-900 hover:bg-slate-100/50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? 'text-[#FF8C00]' : 'text-slate-800'}`} />
                          <span>{t.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* TAB CONTENT: GAME */}
                  {activeTab === 'game' && (
                    <div className="w-full flex flex-col items-center justify-center">
                      
                      {/* Scheduled draw prize banner */}
                      {activeCampaign.prizes.some(p => p.drawDate) && (
                        <div className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-[#FF8C00] text-white shadow-md flex items-center justify-between gap-4">
                          <div className="space-y-1 text-left">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block">
                              🏆 Grand Tirage au Sort (Kor3a)
                            </span>
                            <h4 className="text-sm font-extrabold leading-snug">
                              À gagner : {activeCampaign.prizes.filter(p => p.drawDate).map(p => p.name).join(', ')}
                            </h4>
                            <p className="text-[10px] text-orange-100 font-medium">
                              Tirage prévu le {new Date(activeCampaign.prizes.find(p => p.drawDate)!.drawDate!).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <div className="p-2.5 bg-white/10 rounded-2xl shrink-0">
                            <Trophy className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Real-time credits indicator */}
                      <div className="mb-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full text-[#FF8C00] font-black text-xs flex items-center gap-2 tracking-wide shadow-sm">
                        <Play className="h-3.5 w-3.5 fill-[#FF8C00]" />
                        {spinsLeft} lancers restants
                      </div>

                      <RouletteWheel
                        campaignId={activeCampaign.id}
                        prizes={activeCampaign.prizes.filter(p => !p.drawDate)}
                        email={playerEmail}
                        onSpinSuccess={handleSpinSuccess}
                      />

                    </div>
                  )}

                  {/* TAB CONTENT: PRIZES */}
                  {activeTab === 'prizes' && (
                    <div className="w-full text-left">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                        <Trophy className="h-4 w-4 text-[#FF8C00]" /> Vos gains enregistrés ({playerInfo?.prizesWon?.length || 0})
                      </h3>
                      
                      {playerInfo && playerInfo.prizesWon.length > 0 ? (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {playerInfo.prizesWon.map((wp: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-150 shadow-sm transition-all hover:bg-slate-100/50">
                              <div>
                                <div className="font-extrabold text-slate-800 text-xs">{wp.prizeName}</div>
                                <div className="text-[10px] text-slate-450 mt-1 font-medium">
                                  Gagné le : {new Date(wp.claimedAt).toLocaleDateString('fr-FR')}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">
                                {wp.status === 'PENDING' ? 'En attente' : 'Reçu'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-xs text-slate-400 bg-slate-50 border border-slate-150 rounded-2xl font-semibold">
                          Aucun gain pour le moment. Lancez la roue pour jouer !
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT: REFERRAL */}
                  {activeTab === 'referral' && playerInfo && (
                    <div className="w-full text-left">
                      <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl mb-4">
                        <h3 className="text-xs font-bold text-[#FF8C00] uppercase tracking-wide flex items-center gap-1.5">
                          <Share2 className="h-4 w-4" /> Partagez votre lien de parrainage
                        </h3>
                        <p className="text-slate-550 text-[11px] mt-1.5 leading-relaxed font-semibold">
                          Chaque filleul inscrit vous fait gagner instantanément <span className="text-[#FF8C00] font-black">+2 lancers bonus</span> et ils reçoivent 3 lancers gratuits dès leur arrivée !
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/?ref=${playerInfo.referralCode}`}
                            className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-[10px] font-mono focus:outline-none flex-grow"
                          />
                          <button
                            onClick={handleCopyLink}
                            className="px-4 py-2 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95 shrink-0"
                          >
                            {isCopied ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" /> Copié
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" /> Copier
                              </>
                            )}
                          </button>
                        </div>
                        
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                            `🔥 Tente ta chance à la roulette de loterie pour gagner des voyages et des cadeaux gratuits ! Inscris-toi avec mon lien et obtiens 3 crédits de jeu offerts : ${window.location.origin}/?ref=${playerInfo.referralCode}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm text-center active:scale-95"
                        >
                          Partager sur WhatsApp
                        </a>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: CHALLENGES */}
                  {activeTab === 'challenges' && (
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
                              <span className="text-xs font-extrabold text-slate-800">✈️ Visiter l'agence Obooking</span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-orange-100 text-[#FF8C00] uppercase tracking-wide">
                                +1 Lancer
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              Découvrez les offres de séjours de notre agence partenaire Obooking.
                            </p>
                          </div>

                          {playerInfo?.completedTasks?.includes('VISIT_WEBSITE') ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 self-end sm:self-center">
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
                              <span className="text-xs font-extrabold text-slate-800">📸 Suivre Obooking sur Instagram</span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-orange-100 text-[#FF8C00] uppercase tracking-wide">
                                +1 Lancer
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              Abonnez-vous à notre page Instagram pour des photos inspirantes.
                            </p>
                          </div>

                          {playerInfo?.completedTasks?.includes('FOLLOW_SOCIAL') ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 self-end sm:self-center">
                              <CheckCircle className="h-4 w-4 fill-emerald-100" /> Complété
                            </span>
                          ) : (
                            <button
                              onClick={handleFollowSocial}
                              className="px-3.5 py-2 bg-gradient-to-tr from-[#FF307A] via-[#E100C6] to-[#8600E2] text-white font-extrabold text-xxs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-end sm:self-center shrink-0 active:scale-95"
                            >
                              Suivre <Camera className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Mission 3: Upload Receipt */}
                        <div className="flex flex-col p-4 rounded-xl border-none  bg-slate-50 border border-slate-150 gap-3 transition-all hover:bg-slate-100/30">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-800">🧾 Scanner ticket caisse</span>
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-600 uppercase tracking-wide">
                                  +5 Lancers
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                Importez votre ticket de caisse comme preuve d'achat pour obtenir 5 lancers.
                              </p>
                            </div>

                            {playerInfo?.completedTasks?.includes('RECEIPT_UPLOAD') ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 self-end sm:self-center">
                                <CheckCircle className="h-4 w-4 fill-emerald-100" /> Complété
                              </span>
                            ) : (
                              <div className="relative self-end sm:self-center shrink-0">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  id="receipt-file-input"
                                  disabled={uploadingReceipt}
                                  onChange={handleReceiptUpload}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="receipt-file-input"
                                  className={`px-3.5 py-2 ${
                                    uploadingReceipt 
                                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                      : 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-95'
                                  } font-extrabold text-xxs rounded-lg flex items-center gap-1.5 transition-all shadow-sm`}
                                >
                                  {uploadingReceipt ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" /> Analyse...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-3 w-3" /> Télécharger ticket
                                    </>
                                  )}
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* QR Code Section below challenges list */}
                      <div className="mt-6 p-4 rounded-2xl bg-orange-50/40 border border-orange-100/60 flex flex-col sm:flex-row items-center gap-4 w-full">
                        <div className="bg-white p-2 rounded-xl border border-slate-150 shrink-0 shadow-sm">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/?campaignId=${activeCampaign.id}&source=QR_CODE`)}`} 
                            alt="Code QR de la roulette" 
                            className="h-24 w-24 block bg-white"
                          />
                        </div>
                        <div className="text-center sm:text-left">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-center sm:justify-start">
                            <QrCode className="h-4 w-4 text-[#FF8C00]" /> Scanner pour jouer sur mobile
                          </h4>
                          <p className="text-[10px] text-slate-450 mt-1 font-semibold leading-relaxed">
                            Scannez ce QR Code depuis l'écran de la caisse ou de la borne pour transférer la partie et tourner la roue directement sur votre smartphone !
                          </p>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Date / Validity footer on card */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xxs text-slate-450 flex items-center gap-1.5 font-semibold">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Loterie active du {new Date(activeCampaign.startDate).toLocaleDateString('fr-FR')} au {new Date(activeCampaign.endDate).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. HOW IT WORKS INFO SECTION */}
      <div className="w-full max-w-7xl mt-16 bg-white border border-slate-150 rounded-3xl p-8 shadow-sm">
        <h3 className="text-center font-black text-slate-850 text-sm mb-8 flex items-center justify-center gap-1.5">
          <Info className="h-4 w-4 text-[#FF8C00]" /> Comment fonctionne la loterie ?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="flex flex-col items-center text-center px-4">
            <div className="h-10 w-10 rounded-full bg-orange-100 text-[#FF8C00] font-black text-sm flex items-center justify-center mb-4 shadow-sm">1</div>
            <h4 className="font-extrabold text-slate-850 text-xs mb-2">Inscription Rapide</h4>
            <p className="text-slate-450 text-[11px] leading-relaxed font-semibold">
              Renseignez vos coordonnées pour recevoir 3 jetons de jeu offerts et commencer immédiatement.
            </p>
          </div>

          <div className="flex flex-col items-center text-center px-4">
            <div className="h-10 w-10 rounded-full bg-orange-100 text-[#FF8C00] font-black text-sm flex items-center justify-center mb-4 shadow-sm">2</div>
            <h4 className="font-extrabold text-slate-850 text-xs mb-2">Lancez la Roue</h4>
            <p className="text-slate-450 text-[11px] leading-relaxed font-semibold">
              Faites tourner la roulette animée pour tenter de décrocher des voyages de rêve ou d'autres lots.
            </p>
          </div>

          <div className="flex flex-col items-center text-center px-4">
            <div className="h-10 w-10 rounded-full bg-orange-100 text-[#FF8C00] font-black text-sm flex items-center justify-center mb-4 shadow-sm">3</div>
            <h4 className="font-extrabold text-slate-850 text-xs mb-2">Gagnez des Bonus</h4>
            <p className="text-slate-450 text-[11px] leading-relaxed font-semibold">
              Partagez votre lien de parrainage (+2 lancers par filleul) ou relevez nos défis pour cumuler les lancers.
            </p>
          </div>
        </div>
      </div>
 
      {/* 4. MOBILE FLOATING BOTTOM NAVBAR */}
      {playerEmail && playerName && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-slate-50/95 backdrop-blur-md border border-slate-200/80 p-1 rounded-2xl shadow-xl z-50 flex items-center justify-around md:hidden animate-fade-in">
          {/* Home Button */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex flex-col items-center justify-center gap-1 py-1.5 px-3 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Home className="h-4.5 w-4.5 text-slate-700" />
            <span className="text-[10px] font-bold">Accueil</span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200"></div>

          {/* Dynamic Tabs */}
          {[
            { id: 'game', label: 'Lancer', icon: Play },
            { id: 'challenges', label: 'Défis', icon: Target },
            { id: 'prizes', label: 'Lots', icon: Trophy },
            { id: 'referral', label: 'Parrainage', icon: Share2 }
          ].map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any)
                  const element = document.getElementById('play-zone')
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-white border-[#FF8C00] text-[#FF8C00] font-bold shadow-sm'
                    : 'border-transparent text-slate-800 hover:text-slate-950'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#FF8C00]' : 'text-slate-800'}`} />
                <span className="text-[10px]">{t.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
