import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import QRCode from 'qrcode'
import { Gift, AlertTriangle, ArrowLeft, Mail, User, Calendar, CheckCircle2 } from 'lucide-react'
import { VoucherActions } from '@/components/VoucherActions'

export const dynamic = 'force-dynamic'

interface VoucherPageProps {
  params: Promise<{ id: string }>
}

// Contient des données personnelles (nom/email du gagnant) — jamais indexé.
export const metadata: Metadata = {
  title: "Mon bon d'achat | Obooking Gift",
  robots: { index: false, follow: false },
}

export default async function VoucherPage({ params }: VoucherPageProps) {
  const { id } = await params

  const userPrize = await prisma.userPrize.findUnique({
    where: { id },
    include: {
      user: true,
      prize: {
        include: {
          campaign: {
            include: { partner: true },
          },
        },
      },
    },
  })

  if (!userPrize) {
    return (
      <main className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200/80 rounded-[32px] p-8 max-w-md w-full shadow-xl text-center">
          <AlertTriangle className="h-12 w-12 text-[#FF8C00] mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800">Bon d'Achat Introuvable</h2>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Ce lien n'est plus valide ou le gain associé n'existe pas.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-xs font-black transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </main>
    )
  }

  const partnerName = userPrize.prize.campaign.partner?.name || userPrize.prize.campaign.title
  const confirmationCode = userPrize.id.slice(-8).toUpperCase()
  const wonDate = new Date(userPrize.claimedAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const isDelivered = userPrize.status === 'DELIVERED'

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
  const voucherUrl = `${baseUrl}/voucher/${userPrize.id}`
  const qrDataUrl = await QRCode.toDataURL(voucherUrl, {
    width: 220,
    margin: 1,
    color: { dark: '#1A1A1A', light: '#FFFFFF' },
  })

  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center p-4 overflow-hidden">

      <div className="relative z-10 w-full max-w-sm">
        {/* Ticket card with torn-edge stub effect */}
        <div className="bg-white rounded-[28px] shadow-2xl overflow-hidden border border-slate-100">
          {/* Header */}
          <div className="bg-linear-to-tr from-[#FF8C00] to-orange-500 px-6 py-8 text-center relative">
            <div className="inline-flex p-3 bg-white/15 rounded-2xl mb-3">
              <Gift className="h-8 w-8 text-white" />
            </div>
            <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Bon d'Achat</p>
            <h1 className="text-white font-black text-lg mt-1 leading-snug px-2">{userPrize.prize.name}</h1>
          </div>

          {/* Perforation line */}
          <div className="relative h-0 border-t-2 border-dashed border-slate-200 mx-6">
            <div className="absolute -left-9 -top-3 h-6 w-6 rounded-full bg-[#F1F5F9]" />
            <div className="absolute -right-9 -top-3 h-6 w-6 rounded-full bg-[#F1F5F9]" />
          </div>

          {/* Details */}
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-[#FF8C00]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Gagnant</p>
                <p className="text-sm font-bold text-slate-800">{userPrize.user.name || 'Client'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-[#FF8C00]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Email</p>
                <p className="text-sm font-bold text-slate-800 break-all">{userPrize.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-[#FF8C00]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Gagné le</p>
                <p className="text-sm font-bold text-slate-800">{wonDate}</p>
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wide ${
              isDelivered
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              <CheckCircle2 className="h-4 w-4" />
              {isDelivered ? 'Remis' : 'En attente de remise'}
            </div>

            {/* QR code — mis en valeur, à présenter en agence */}
            <div className="flex flex-col items-center pt-2">
              <img
                src={qrDataUrl}
                alt="QR code du bon d'achat"
                className="h-40 w-40 rounded-2xl border border-slate-200 p-2 bg-white shadow-sm"
              />
              <p className="text-[10px] text-slate-450 mt-3 font-semibold text-center max-w-[220px]">
                Présentez ce QR code (ou le code ci-dessous) en agence lors de la remise de votre lot.
              </p>
            </div>

            <VoucherActions
              prizeName={userPrize.prize.name}
              partnerName={partnerName}
              winnerName={userPrize.user.name || 'Client'}
              confirmationCode={confirmationCode}
              wonDate={wonDate}
              qrDataUrl={qrDataUrl}
              voucherUrl={voucherUrl}
            />
          </div>

          {/* Code footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Code de confirmation</p>
            <p className="text-lg font-black text-slate-800 tracking-[0.2em]">{confirmationCode}</p>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">Offert par {partnerName}</p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-5 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à l'accueil
        </Link>
      </div>
    </main>
  )
}
