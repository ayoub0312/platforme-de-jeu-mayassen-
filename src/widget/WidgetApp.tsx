'use client'

import React, { useState, useEffect } from 'react'
import { trpc } from '../utils/trpc'
import { RouletteWheel } from '../components/RouletteWheel'
import {
  Gift,
  X,
  Sparkles,
  User,
  Mail,
  Play,
  Trophy,
  CheckCircle,
  Copy,
  ChevronRight,
  Info,
  Calendar,
  Share2,
  ArrowRight,
  Target
} from 'lucide-react'

interface WidgetAppProps {
  partnerId?: string
  partnerName?: string
  initialUserEmail?: string
  initialUserName?: string
}

export function WidgetApp({ partnerId, partnerName, initialUserEmail, initialUserName }: WidgetAppProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'game' | 'challenges' | 'prizes'>('game')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // Player session states
  const [playerEmail, setPlayerEmail] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [spinsLeft, setSpinsLeft] = useState<number>(0)
  const [isPromoCopied, setIsPromoCopied] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev)
    }, 5000)
  }

  // Registration/Lead Form states
  const [emailInput, setEmailInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load active campaigns for this partner
  const { data: campaigns, isLoading } = trpc.getCampaigns.useQuery(
    { partnerId, partnerName },
    {
      refetchOnWindowFocus: false,
    }
  )

  const activeCampaign = campaigns && campaigns.length > 0 ? campaigns[0] : null

  // Fetch player details if logged in
  const { data: playerInfo, refetch: refetchPlayer } = trpc.getPlayerInfo.useQuery(
    { 
      email: playerEmail || '', 
      campaignId: activeCampaign?.id || '' 
    },
    { 
      enabled: !!playerEmail && !!activeCampaign?.id 
    }
  )

  const leadMutation = trpc.captureLead.useMutation()
  const claimTaskMutation = trpc.claimTaskToken.useMutation()

  // Load session from attributes or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (initialUserEmail && activeCampaign) {
        // Automatically register/retrieve user session via tRPC in the background
        leadMutation.mutate(
          {
            email: initialUserEmail,
            name: initialUserName || 'Client B2B',
            campaignId: activeCampaign.id,
            partnerId: activeCampaign.partnerId || '',
            source: 'WIDGET',
          },
          {
            onSuccess: (data) => {
              setPlayerEmail(initialUserEmail)
              setPlayerName(initialUserName || 'Client B2B')
              setSpinsLeft(data.tokensCount)
              localStorage.setItem('obooking_widget_email', initialUserEmail)
              localStorage.setItem('obooking_widget_name', initialUserName || 'Client B2B')
            },
            onError: (err) => {
              console.error('[Obooking Widget] Auto-login registration failed:', err)
              // Fallback: use stored localStorage credentials if present
              const storedEmail = localStorage.getItem('obooking_widget_email')
              const storedName = localStorage.getItem('obooking_widget_name')
              if (storedEmail && storedName) {
                setPlayerEmail(storedEmail)
                setPlayerName(storedName)
              }
            }
          }
        )
      } else if (!initialUserEmail) {
        const storedEmail = localStorage.getItem('obooking_widget_email')
        const storedName = localStorage.getItem('obooking_widget_name')
        if (storedEmail && storedName) {
          setPlayerEmail(storedEmail)
          setPlayerName(storedName)
        }
      }
    }
  }, [initialUserEmail, initialUserName, activeCampaign])

  // Sync spins
  useEffect(() => {
    if (playerInfo !== undefined) {
      setSpinsLeft(playerInfo.tokens)
    }
  }, [playerInfo])

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput || !nameInput || !activeCampaign) return

    setIsSubmitting(true)
    leadMutation.mutate(
      {
        email: emailInput,
        name: nameInput,
        campaignId: activeCampaign.id,
        partnerId: activeCampaign.partnerId || '',
        source: 'WIDGET',
      },
      {
        onSuccess: (data) => {
          setPlayerEmail(emailInput)
          setPlayerName(nameInput)
          setSpinsLeft(data.tokensCount)
          setIsSubmitting(false)
          if (typeof window !== 'undefined') {
            localStorage.setItem('obooking_widget_email', emailInput)
            localStorage.setItem('obooking_widget_name', nameInput)
          }
        },
        onError: (err) => {
          setIsSubmitting(false)
          showToast(err.message)
        }
      }
    )
  }

  const handleSpinSuccess = (prize: any, remainingSpins: number) => {
    setSpinsLeft(remainingSpins)
    refetchPlayer()

    // 1. Dispatch custom event to parent host page (Shadow DOM breakout)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('obooking-widget-win', {
          detail: {
            email: playerEmail,
            prize: {
              id: prize.id,
              name: prize.name,
              type: prize.type,
            },
            partnerId: partnerId || activeCampaign?.partnerId,
            partnerName: partnerName || activeCampaign?.partner?.name,
          },
        })
      )

      // 2. Store won details in localStorage for client script reads
      localStorage.setItem(
        'obooking_won_prize',
        JSON.stringify({
          id: prize.id,
          name: prize.name,
          type: prize.type,
          wonAt: new Date().toISOString(),
        })
      )

      // 3. Write dynamic cookie for cart/checkout auto-application
      document.cookie = `obooking_coupon_won=${encodeURIComponent(prize.name)}; path=/; max-age=86400; SameSite=Lax`
    }
  }

  const handleCopyPromo = (code: string) => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setIsPromoCopied(true)
    setTimeout(() => setIsPromoCopied(false), 2000)
  }

  const handleVisitWebsite = () => {
    if (!activeCampaign || !playerEmail) return
    if (playerInfo?.completedTasks?.includes('VISIT_WEBSITE')) return
    window.open('https://obooking.com', '_blank')
    claimTaskMutation.mutate(
      {
        email: playerEmail,
        campaignId: activeCampaign.id,
        taskType: 'VISIT_WEBSITE',
      },
      {
        onSuccess: (data) => {
          refetchPlayer()
        },
        onError: (err) => {
          showToast(err.message)
        }
      }
    )
  }

  const handleFollowSocial = () => {
    if (!activeCampaign || !playerEmail) return
    if (playerInfo?.completedTasks?.includes('FOLLOW_SOCIAL')) return
    window.open('https://instagram.com/obooking', '_blank')
    claimTaskMutation.mutate(
      {
        email: playerEmail,
        campaignId: activeCampaign.id,
        taskType: 'FOLLOW_SOCIAL',
      },
      {
        onSuccess: (data) => {
          refetchPlayer()
        },
        onError: (err) => {
          showToast(err.message)
        }
      }
    )
  }

  const handleLogout = () => {
    setPlayerEmail(null)
    setPlayerName(null)
    setSpinsLeft(0)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('obooking_widget_email')
      localStorage.removeItem('obooking_widget_name')
    }
  }

  // The widget only supports the Roulette flow — Tirage au Sort campaigns
  // aren't shown here (they rely on the full campaign portal experience).
  if (isLoading || !activeCampaign || activeCampaign.gameMode === 'DRAW') return null

  const pName = activeCampaign.partner?.name || ' '
  const isToutEstLa = pName.toLowerCase().includes('tout est la') || pName.toLowerCase().includes('tout')
  const brandAccent = isToutEstLa ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#FF8C00] hover:bg-[#e07b00]'
  const brandText = isToutEstLa ? 'text-[#10B981]' : 'text-[#FF8C00]'
  const brandBorder = isToutEstLa ? 'border-[#10B981]/20' : 'border-[#FF8C00]/20'
  const brandBg = isToutEstLa ? 'bg-[#10B981]/10' : 'bg-[#FF8C00]/10'

  return (
    <div className="font-sans antialiased text-slate-900 selection:bg-orange-500/30">
      
      {/* 1. FLOATING BUBBLE BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-[0_12px_24px_-4px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 z-999 cursor-pointer group animate-bounce ${
            isToutEstLa ? 'bg-linear-to-r from-emerald-500 to-emerald-600' : 'bg-linear-to-r from-[#FF8C00] to-[#E07B00]'
          }`}
          title="Tentez votre chance !"
        >
          <Gift className="h-6 w-6 animate-pulse" />
          
          {/* Label Tooltip */}
          <span className="absolute right-16 bg-slate-900 text-white text-[11px] font-black py-1.5 px-3.5 rounded-xl shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap tracking-wide">
            Jeu Roulette 🎁
          </span>
        </button>
      )}

      {/* 2. SLIDING DRAWER / MODAL COMPONENT */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 w-full sm:w-[400px] h-full sm:h-[650px] bg-slate-950/80 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none z-[999999] flex items-end sm:items-stretch justify-center">
          
          <div className="w-full h-[90vh] sm:h-full bg-slate-950 sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl relative animate-fade-in">
            
            {/* Toast Message banner */}
            {toastMessage && (
              <div className="absolute top-4 inset-x-4 z-[9999] bg-slate-900 border border-slate-800 text-white text-[11px] font-black px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 animate-fade-in">
                <span>{toastMessage}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Header section with Dynamic glows */}
            <div className="absolute top-0 inset-x-0 h-24 bg-linear-to-b from-purple-500/10 to-transparent pointer-events-none" />
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl pointer-events-none ${isToutEstLa ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`} />

            {/* Header Content */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${brandBg} ${brandText}`}>
                  <Gift className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white capitalize leading-tight">
                    Loterie {pName}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Tournez la roue &amp; Gagnez
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Main scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 relative z-10 no-scrollbar">
              
              {/* Tab Navigation (only if logged in) */}
              {playerEmail && (
                <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-0.5 w-full">
                  {(['game', 'challenges', 'prizes'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all capitalize cursor-pointer ${
                        activeTab === tab
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab === 'game' ? 'Roulette' : tab === 'challenges' ? 'Défis' : 'Lots'}
                    </button>
                  ))}
                </div>
              )}

              {/* TAB CONTENT: GAME / LOGIN */}
              {activeTab === 'game' && (
                <div className="space-y-6">
                  {!playerEmail ? (
                    /* Lead capture form */
                    <form onSubmit={handleRegister} className="space-y-4 py-4 text-left">
                      <div className="text-center space-y-2 mb-6">
                        <div className="inline-flex p-3 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF8C00]">
                          <Sparkles className="h-6 w-6 animate-pulse" />
                        </div>
                        <h4 className="text-sm font-black text-white">Rejoignez la Loterie !</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold max-w-xs mx-auto">
                          Entrez votre e-mail et votre nom pour débloquer vos lancers.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Nom Complet</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                              <User className="h-4 w-4" />
                            </span>
                            <input
                              type="text"
                              required
                              placeholder="Votre nom"
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Adresse E-mail</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                              <Mail className="h-4 w-4" />
                            </span>
                            <input
                              type="email"
                              required
                              placeholder="Votre adresse email"
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-97 cursor-pointer mt-6 ${brandAccent}`}
                      >
                        {isSubmitting ? 'Chargement...' : 'Rejoindre la loterie'}
                      </button>
                    </form>
                  ) : (
                    /* The actual roulette wheel container */
                    <div className="flex flex-col items-center space-y-4">

                      {/* Spins header indicator */}
                      <div className="flex justify-between items-center w-full px-1">
                        <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Joueur</div>
                          <div className="text-xs font-black text-white truncate max-w-[150px]">{playerName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Lancers restants</div>
                          <div className="text-xs font-black text-[#FF8C00]">{spinsLeft} Spins</div>
                        </div>
                      </div>

                      {/* Small Roulette Wheel */}
                      <div className="w-full flex justify-center py-2">
                        <RouletteWheel
                          campaignId={activeCampaign.id}
                          prizes={activeCampaign.prizes.filter((p: any) => !p.drawDate)}
                          email={playerEmail}
                          onSpinSuccess={handleSpinSuccess}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: CHALLENGES */}
              {activeTab === 'challenges' && playerEmail && (
                <div className="space-y-4 text-left py-1">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-black text-white flex items-center gap-1">
                      <Target className="h-4 w-4 text-[#FF8C00]" /> Gagnez des Spins Bonus
                    </h4>
                    <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-[9px] font-black text-[#FF8C00]">
                      +4 lancers
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Mission 1: Visit Website */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">✈️ Visiter notre site</span>
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-[#FF8C00] text-[8px] font-black">+2 Spins</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-semibold">
                          Visitez l'agence Obooking Voyage pour obtenir vos spins.
                        </p>
                      </div>

                      {playerInfo?.completedTasks?.includes('VISIT_WEBSITE') ? (
                        <span className="text-xxs font-black text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle className="h-3.5 w-3.5" /> Fait
                        </span>
                      ) : (
                        <button
                          onClick={handleVisitWebsite}
                          className={`px-3 py-1.5 ${brandAccent} text-white font-extrabold text-[10px] rounded-lg transition-all active:scale-95 cursor-pointer`}
                        >
                          Visiter
                        </button>
                      )}
                    </div>

                    {/* Mission 2: Follow Social */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">📸 Suivre sur Instagram</span>
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-[#FF8C00] text-[8px] font-black">+2 Spins</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-semibold">
                          Suivez Obooking sur Instagram pour obtenir vos spins.
                        </p>
                      </div>

                      {playerInfo?.completedTasks?.includes('FOLLOW_SOCIAL') ? (
                        <span className="text-xxs font-black text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle className="h-3.5 w-3.5" /> Fait
                        </span>
                      ) : (
                        <button
                          onClick={handleFollowSocial}
                          className={`px-3 py-1.5 ${brandAccent} text-white font-extrabold text-[10px] rounded-lg transition-all active:scale-95 cursor-pointer`}
                        >
                          Suivre
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PRIZES / LOTS */}
              {activeTab === 'prizes' && playerEmail && (
                <div className="space-y-4 text-left py-1">
                  <h4 className="text-xs font-black text-white flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-[#FF8C00]" /> Liste des Lots
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {activeCampaign.prizes.map((prize) => (
                      <div key={prize.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-[#FF8C00]/10 rounded-lg text-[#FF8C00]">
                            <Trophy className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white leading-tight">{prize.name}</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                              {prize.type === 'DIGITAL' ? 'Bon Cadeau Virtuel' : 'Cadeau Physique'}
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] font-black text-slate-400">
                          {prize.totalStock === -1 ? 'Stock Illimité' : `${prize.remainingStock} restants`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Coupon section at bottom */}
                  {activeCampaign.promoCode && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mt-6">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">CODE PROMO DU MOMENT</div>
                      <div className="text-xs font-extrabold text-white mt-1 uppercase">{activeCampaign.promoTitle || "Seychelles Escape"}</div>
                      
                      <button
                        onClick={() => handleCopyPromo(activeCampaign.promoCode!)}
                        className={`w-full group/btn flex items-center justify-between bg-[#0E0C1B] hover:bg-[#151228] border ${
                          isPromoCopied ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' : 'border-white/5 hover:border-[#FF8C00]/30 text-white'
                        } rounded-xl p-3 mt-3 cursor-pointer transition-all active:scale-97`}
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Code promo</span>
                          <span className="text-xs font-mono font-black text-white tracking-wide">{activeCampaign.promoCode}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black text-[#FF8C00] uppercase tracking-wider">
                          {isPromoCopied ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">✔ COPIÉ</span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-400 group-hover/btn:text-[#FF8C00] transition-colors">
                              <Copy className="h-3 w-3" /> COPIER
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Sticky footer (only if logged in, to log out) */}
            {playerEmail && (
              <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950 z-10 relative">
                <span className="text-[9px] text-slate-500 font-extrabold uppercase">Session active</span>
                <button
                  onClick={handleLogout}
                  className="text-[9px] font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                >
                  Se déconnecter 
                </button>
              </div>
            )}

          </div>

        </div>
      )}
      
    </div>
  )
}
