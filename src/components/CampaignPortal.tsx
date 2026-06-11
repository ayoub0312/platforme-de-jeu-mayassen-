'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { LeadCaptureModal } from './LeadCaptureModal'
import { HelpCircle, LogOut, Calendar, Radio } from 'lucide-react'

// Subcomponents
import { HeroBanner } from './campaign-portal/HeroBanner'
import { ActiveGamesList } from './campaign-portal/ActiveGamesList'
import { TabNavigation } from './campaign-portal/TabNavigation'
import { GameTab } from './campaign-portal/GameTab'
import { DrawsTab } from './campaign-portal/DrawsTab'
import { PrizesTab } from './campaign-portal/PrizesTab'
import { ReferralTab } from './campaign-portal/ReferralTab'
import { ChallengesTab } from './campaign-portal/ChallengesTab'
import { HowItWorks } from './campaign-portal/HowItWorks'
import { MobileNavbar } from './campaign-portal/MobileNavbar'

interface CampaignPortalProps {
  initialCampaigns: any[]
  partnerId?: string
  partnerName?: string
}

export function CampaignPortal({ initialCampaigns, partnerId, partnerName }: CampaignPortalProps) {
  const searchParams = useSearchParams()
  const referredByCode = searchParams.get('ref') || undefined

  const [activeTab, setActiveTab] = useState<'game' | 'draws' | 'prizes' | 'referral' | 'challenges'>('game')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // Player session states
  const [playerEmail, setPlayerEmail] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [spinsLeft, setSpinsLeft] = useState<number>(0)
  const [isCopied, setIsCopied] = useState(false)
  const [isPromoCopied, setIsPromoCopied] = useState(false)

  // Load active campaigns
  const { data: campaigns } = trpc.getCampaigns.useQuery(
    { partnerId, partnerName },
    {
      initialData: initialCampaigns,
    }
  )

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

  // tRPC mutations
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

  const handleJoinDraw = () => {
    if (!activeCampaign) return
    if (playerInfo?.completedTasks?.includes('JOIN_DRAW')) return
    claimTaskMutation.mutate(
      {
        email: playerEmail || '',
        campaignId: activeCampaign.id,
        taskType: 'JOIN_DRAW',
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

  const handleSpinSuccess = (prize: any, remainingSpins: number) => {
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

  const handleCopyPromo = (code: string) => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setIsPromoCopied(true)
    setTimeout(() => setIsPromoCopied(false), 2000)
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
          Il n'y a actuellement aucune campagne de configurée. Veuillez repasser plus tard.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* 1. ROTATING HERO ADS BANNER */}
      <HeroBanner
        activeCampaign={activeCampaign}
        playerEmail={playerEmail}
        setActiveTab={setActiveTab}
        isPromoCopied={isPromoCopied}
        handleCopyPromo={handleCopyPromo}
      />

      {/* 2. MAIN HUB GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl items-start">
        {/* LEFT COLUMN: ACTIVE DRAWS / KOR3A */}
        {campaigns && campaigns.length > 1 && (
          <ActiveGamesList
            campaigns={campaigns}
            activeCampaign={activeCampaign}
            handleSwitchCampaign={handleSwitchCampaign}
          />
        )}

        {/* RIGHT COLUMN: ROULETTE ARENA */}
        <div
          id="play-zone"
          className={`flex flex-col items-center w-full ${
            campaigns && campaigns.length > 1 ? 'lg:col-span-7' : 'lg:col-span-12'
          }`}
        >
          <div className="w-full flex items-center justify-between px-2 mb-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              🎡 Zone de Jeu
            </h3>
           
          </div>

          {/* Main Card Container */}
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl">
            {/* Card Header for Authenticated Users */}
            {playerEmail && playerName && (
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-[#FF8C00] font-extrabold text-sm uppercase">
                    {playerName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{playerName}</div>
                    <div className="text-[10px] text-slate-450 font-medium">{playerEmail}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xxs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" /> Quitter
                </button>
              </div>
            )}

            {/* Card Body */}
            <div className="p-6 sm:p-8 flex-1 bg-white">
              {!playerEmail || !playerName ? (
                <LeadCaptureModal
                  campaignId={activeCampaign.id}
                  partnerId={activeCampaign.partnerId || ''}
                  referredByCode={referredByCode}
                  onSuccess={handleLeadCaptureSuccess}
                />
              ) : (
                <div className="flex flex-col items-center w-full">
                  {/* Internal horizontal tabs */}
                  <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

                  {/* TAB CONTENT: GAME */}
                  {activeTab === 'game' && (
                    <GameTab
                      activeCampaign={activeCampaign}
                      playerEmail={playerEmail!}
                      spinsLeft={spinsLeft}
                      onSpinSuccess={handleSpinSuccess}
                    />
                  )}

                  {/* TAB CONTENT: DRAWS */}
                  {activeTab === 'draws' && (
                    <DrawsTab
                      activeCampaign={activeCampaign}
                      playerInfo={playerInfo}
                      uploadingReceipt={uploadingReceipt}
                      handleReceiptUpload={handleReceiptUpload}
                      handleJoinDraw={handleJoinDraw}
                    />
                  )}

                  {/* TAB CONTENT: PRIZES */}
                  {activeTab === 'prizes' && <PrizesTab playerInfo={playerInfo} />}

                  {/* TAB CONTENT: REFERRAL */}
                  {activeTab === 'referral' && (
                    <ReferralTab
                      playerInfo={playerInfo}
                      isCopied={isCopied}
                      handleCopyLink={handleCopyLink}
                    />
                  )}

                  {/* TAB CONTENT: CHALLENGES */}
                  {activeTab === 'challenges' && (
                    <ChallengesTab
                      playerInfo={playerInfo}
                      handleVisitWebsite={handleVisitWebsite}
                      handleFollowSocial={handleFollowSocial}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Date / Validity footer on card */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xxs text-slate-450 flex items-center gap-1.5 font-semibold">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                active du {new Date(activeCampaign.startDate).toLocaleDateString('fr-FR')} au{' '}
                {new Date(activeCampaign.endDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HOW IT WORKS INFO SECTION */}
      <HowItWorks />

      {/* 4. MOBILE FLOATING BOTTOM NAVBAR */}
      <MobileNavbar
        playerEmail={playerEmail}
        playerName={playerName}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  )
}
