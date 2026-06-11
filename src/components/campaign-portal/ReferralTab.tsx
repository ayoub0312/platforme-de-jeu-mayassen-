'use client'

import React from 'react'
import { Share2, CheckCircle, Copy } from 'lucide-react'

interface ReferralTabProps {
  playerInfo: any
  isCopied: boolean
  handleCopyLink: () => void
}

// Custom vector brand icons to avoid Lucide package version mismatch errors
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.005 5.234 5.24.001 11.694 0c3.127.001 6.067 1.22 8.277 3.431s3.427 5.152 3.428 8.28c-.005 6.463-5.24 11.697-11.695 11.697-2.001-.001-3.97-.51-5.713-1.482L0 24zm6.47-4.103c1.674.992 3.32 1.52 5.176 1.521 5.393 0 9.779-4.385 9.782-9.782.002-2.613-.996-5.068-2.812-6.885-1.817-1.816-4.272-2.812-6.886-2.814-5.396 0-9.784 4.386-9.787 9.784-.001 1.944.516 3.52 1.481 5.138L2.505 21.56l4.022-1.063zm10.741-6.1c-.266-.134-1.583-.78-1.827-.869-.244-.088-.423-.133-.6.134-.177.266-.688.868-.843 1.046-.155.177-.31.2-.577.067-.266-.134-1.127-.416-2.147-1.326-.793-.707-1.328-1.58-1.484-1.847-.155-.266-.016-.41.118-.543.121-.119.266-.31.4-.466.133-.155.178-.266.266-.443.089-.177.044-.332-.022-.466-.067-.134-.6-1.442-.821-1.974-.217-.522-.456-.451-.628-.46l-.535-.008c-.185 0-.486.07-.74.348-.256.277-.976.953-.976 2.324 0 1.372 1.002 2.697 1.14 2.884.14.187 1.97 3.007 4.773 4.218.666.288 1.187.46 1.593.589.67.213 1.28.183 1.761.11.537-.081 1.584-.648 1.805-1.277.222-.63.222-1.171.155-1.277-.067-.107-.244-.175-.51-.308z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.477 2 2 6.145 2 11.257c0 2.913 1.45 5.518 3.725 7.158V22l3.41-1.874c.883.245 1.83.38 2.865.38 5.523 0 10-4.145 10-9.257C22 6.145 17.523 2 12 2zm1.096 11.968l-2.585-2.766-5.043 2.766 5.545-5.888 2.64 2.766 4.988-2.766-5.545 5.888z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export function ReferralTab({
  playerInfo,
  isCopied,
  handleCopyLink,
}: ReferralTabProps) {
  if (!playerInfo?.referralCode) return null

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${playerInfo.referralCode}`

  const handleInstagramShare = () => {
    handleCopyLink()
    if (typeof window !== 'undefined') {
      window.open('https://instagram.com/direct/inbox/', '_blank')
    }
  }

  const handleSystemShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Gagnez des voyages avec Obooking',
          text: `🔥 Tente ta chance à la roulette pour gagner des voyages et des cadeaux gratuits !`,
          url: referralLink,
        })
      } catch (err) {
        // Ignored share cancellations
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="w-full text-left space-y-5">
      {/* Informational Notice Block */}
      <div className="bg-gradient-to-br from-orange-50/60 via-orange-50/30 to-transparent border border-orange-100 p-5 rounded-3xl relative overflow-hidden shadow-xs">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-orange-100/30 pointer-events-none">
          <Share2 className="h-24 w-24 stroke-[1.5]" />
        </div>
        <h3 className="text-xs font-black text-[#FF8C00] uppercase tracking-wider flex items-center gap-2">
          <span className="p-1 rounded-lg bg-orange-100/80 text-[#FF8C00]">
            <Share2 className="h-3.5 w-3.5" />
          </span>
          Partagez votre lien de parrainage
        </h3>
        <p className="text-slate-650 text-xs mt-3 leading-relaxed font-semibold">
          Chaque filleul inscrit vous fait gagner instantanément <span className="text-[#FF8C00] font-black">+2 lancers bonus</span> et ils reçoivent 3 lancers gratuits dès leur arrivée !
        </p>
      </div>

      <div className="space-y-4">
        {/* Link Input and Copy Button */}
        <div className="flex gap-2.5">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl text-[11px] font-mono focus:outline-none flex-1 shadow-inner"
          />
          <button
            onClick={handleCopyLink}
            className="px-5 py-3 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-orange-500/10 active:scale-95 shrink-0"
          >
            {isCopied ? (
              <>
                <CheckCircle className="h-4 w-4" /> Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copier
              </>
            )}
          </button>
        </div>

        {/* Social Share Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* WhatsApp share */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `🔥 Tente ta chance à la roulette pour gagner des voyages et des cadeaux gratuits ! Inscris-toi avec mon lien et obtiens 3 crédits de jeu offerts : ${referralLink}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm hover:shadow"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            <span>WhatsApp</span>
          </a>

          {/* Facebook share */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm hover:shadow"
          >
            <FacebookIcon className="h-4 w-4 shrink-0" />
            <span>Facebook</span>
          </a>

          {/* Messenger share */}
          <a
            href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(referralLink)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#0084FF] hover:bg-[#0076e4] text-white font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm hover:shadow"
          >
            <MessengerIcon className="h-4 w-4 shrink-0" />
            <span>Messenger</span>
          </a>

          {/* Instagram DMs share */}
          <button
            onClick={handleInstagramShare}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-tr from-[#F56040] via-[#E1306C] to-[#833AB4] hover:brightness-110 text-white font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm hover:shadow border-none"
          >
            <InstagramIcon className="h-4 w-4 shrink-0" />
            <span>Instagram</span>
          </button>
        </div>

        {/* Native Web Share button */}
        <button
          onClick={handleSystemShare}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-slate-900/10 active:scale-[0.99] mt-2"
        >
          <Share2 className="h-4 w-4" />
          <span>Partager sur d'autres applications</span>
        </button>
      </div>
    </div>
  )
}
