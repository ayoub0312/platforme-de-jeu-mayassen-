import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import QRCode from 'qrcode'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
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
      <main className="min-h-screen flex items-center justify-center px-4 bg-paper">
        <div className="w-full max-w-md">
          <p className="text-[13px] font-medium text-ink-500">Bon introuvable</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">Ce bon n&apos;existe pas ou plus</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
            Le lien n&apos;est plus valide ou le gain associé a été supprimé.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center gap-2 px-4 btn-game text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l&apos;accueil
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
    color: { dark: '#241F1C', light: '#FFFFFF' },
  })

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-paper text-ink-900">
      <div className="w-full max-w-sm">
        <article className="rounded-2xl border border-rule bg-surface overflow-hidden" style={{ boxShadow: 'var(--shadow-premium-md)' }}>
          <div className="h-1 bg-brand-500" aria-hidden="true" />
          <header className="px-6 pt-6 pb-5">
            <p className="text-[13px] text-ink-500">Bon d&apos;achat · {partnerName}</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight leading-tight [overflow-wrap:anywhere]">{userPrize.prize.name}</h1>
            <p className={`mt-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium ${
              isDelivered ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'
            }`}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {isDelivered ? 'Lot remis' : 'En attente de remise'}
            </p>
          </header>

          <dl className="mx-6 border-y border-rule divide-y divide-rule text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-ink-500">Gagnant</dt>
              <dd className="font-medium text-right">{userPrize.user.name || 'Client'}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-ink-500">Email</dt>
              <dd className="font-medium text-right min-w-0 [overflow-wrap:anywhere]">{userPrize.user.email}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-ink-500">Gagné le</dt>
              <dd className="font-medium text-right">{wonDate}</dd>
            </div>
          </dl>

          <div className="px-6 pt-6 pb-6">
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code du bon d'achat" className="h-44 w-44 rounded-xl border border-rule p-2 bg-white" />
              <p className="text-[13px] text-ink-500 mt-3 text-center max-w-[240px] leading-snug">
                Présentez ce QR code ou le code ci-dessous lors de la remise de votre lot.
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

          <footer className="bg-paper-2 border-t border-rule px-6 py-4 flex items-center justify-between gap-4">
            <span className="text-[13px] text-ink-500">Code de confirmation</span>
            <span className="font-mono text-base font-medium tracking-[0.18em]">{confirmationCode}</span>
          </footer>
        </article>

        <Link
          href="/"
          className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
