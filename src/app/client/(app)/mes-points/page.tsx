'use client'

import { useState } from 'react'
import { Coins, Check, Copy, ArrowRight } from 'lucide-react'
import { trpc } from '@/utils/trpc'

export default function MesPointsPage() {
  const { data: points, isLoading, refetch: refetchPoints } = trpc.getMyLoyaltyPoints.useQuery()
  const { data: config } = trpc.getLoyaltyPublicConfig.useQuery()
  const { data: history, refetch: refetchHistory } = trpc.getMyPointsHistory.useQuery()
  const redeemMut = trpc.redeemMyPoints.useMutation()
  const utils = trpc.useUtils()

  const balance = points?.balance ?? 0
  const redeemRate = config?.redeemPointsPerTnd ?? 100
  const minRedeem = config?.minRedeemPoints ?? 500
  const enabled = config?.loyaltyEnabled ?? false

  const [amount, setAmount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<{ code: string; valueTnd: number; expiresAt: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const value = redeemRate > 0 ? Math.floor((amount / redeemRate) * 100) / 100 : 0
  const canRedeem = enabled && amount >= minRedeem && amount <= balance && value > 0
  const convertibleTnd = redeemRate > 0 ? Math.floor((balance / redeemRate) * 100) / 100 : 0

  const handleRedeem = async () => {
    setError(null)
    setGenerated(null)
    try {
      const res = await redeemMut.mutateAsync({ points: amount })
      setGenerated({ code: res.code, valueTnd: res.valueTnd, expiresAt: res.expiresAt })
      setAmount(0)
      refetchPoints()
      refetchHistory()
      utils.getMyVouchers.invalidate()
    } catch (err: any) {
      setError(err?.message || 'Échec de la conversion.')
    }
  }

  const copyCode = () => {
    if (generated) {
      navigator.clipboard.writeText(generated.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR')
  const fmtTnd = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Mes points merci</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1.5 max-w-lg">
          Cumulez des points à chaque achat sur obooking.tn, puis convertissez-les en bons de réduction.
        </p>
      </header>

      {/* Solde — le seul moment "fort" de la page */}
      {isLoading ? (
        <div className="h-32 rounded-2xl skeleton-shimmer mb-8" />
      ) : (
        <section className="relative overflow-hidden rounded-2xl bg-[var(--brand-600)] text-white p-7 mb-8 shadow-[var(--shadow-premium-md)]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">
            <Coins className="h-3.5 w-3.5" /> Solde disponible
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-5xl font-semibold leading-none tabular-nums">{fmt(balance)}</span>
            <span className="text-lg font-semibold text-white/80 pb-1">points</span>
          </div>
          {enabled && (
            <div className="mt-3 text-sm text-white/75 tabular-nums">≈ {fmtTnd(convertibleTnd)} TND convertibles</div>
          )}
        </section>
      )}

      {/* Conversion */}
      {!enabled ? (
        <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] p-6 mb-10 text-sm text-[var(--ink-500)]">
          Le programme de fidélité est actuellement désactivé. Revenez bientôt.
        </div>
      ) : (
        <section className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-sm)] p-6 mb-10">
          <h2 className="text-base font-semibold text-[var(--ink-900)]">Convertir mes points en bon</h2>
          <p className="text-[13px] text-[var(--ink-500)] mt-0.5 tabular-nums">
            {redeemRate} points = 1 TND · minimum {minRedeem} points
          </p>

          <label className="block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mt-6 mb-2">Points à convertir</label>
          <div className="flex items-stretch gap-2">
            <input
              type="number"
              min={0}
              max={balance}
              value={amount || ''}
              onChange={(e) => { setAmount(parseInt(e.target.value) || 0); setError(null) }}
              placeholder={`Min. ${minRedeem}`}
              className="flex-1 h-12 bg-[var(--surface-alt)] border border-black/[0.08] rounded-xl px-4 text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/25 focus:border-[var(--brand-500)]"
            />
            <button
              type="button"
              onClick={() => setAmount(balance)}
              className="shrink-0 px-4 rounded-xl border border-black/[0.08] text-xs font-bold text-[var(--brand-700)] hover:bg-[var(--brand-50)] transition-colors tabular-nums"
            >
              Tout ({fmt(balance)})
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 py-3 border-t border-b border-dashed border-black/[0.1]">
            <span className="text-[13px] font-medium text-[var(--ink-500)]">Valeur du bon</span>
            <span className="font-display text-2xl font-semibold text-[var(--brand-600)] tabular-nums">{fmtTnd(value)} TND</span>
          </div>

          {error && (
            <div className="mt-4 text-[13px] font-medium text-[var(--danger)] bg-[var(--danger)]/[0.07] border border-[var(--danger)]/20 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleRedeem}
            disabled={!canRedeem || redeemMut.isPending}
            className="mt-5 w-full h-12 inline-flex items-center justify-center gap-2 bg-[var(--brand-500)] hover:bg-[var(--brand-600)] disabled:bg-black/[0.08] disabled:text-[var(--ink-500)] disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
          >
            {redeemMut.isPending ? 'Conversion…' : <>Générer mon bon <ArrowRight className="h-4 w-4" /></>}
          </button>

          {/* Bon généré — style ticket */}
          {generated && (
            <div className="mt-5 rounded-xl border border-[var(--brand-500)]/25 bg-[var(--brand-50)] p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)]">
                Bon de réduction · {fmtTnd(generated.valueTnd)} TND
              </div>
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="font-mono text-2xl font-bold tracking-[0.15em] text-[var(--ink-900)]">{generated.code}</span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)] border border-[var(--brand-500)]/30 rounded-lg px-3 py-1.5 hover:bg-[var(--brand-500)]/10 transition-colors"
                >
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> Copier</>}
                </button>
              </div>
              <div className="text-[12px] text-[var(--ink-500)] mt-2.5">
                À utiliser sur obooking.tn lors de votre prochain achat
                {generated.expiresAt ? ` · valable jusqu'au ${new Date(generated.expiresAt).toLocaleDateString('fr-FR')}` : ' · sans expiration'}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Historique */}
      <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-3">Historique des points</h2>
      {history && history.length > 0 ? (
        <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] divide-y divide-black/[0.05] overflow-hidden">
          {history.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--ink-900)]">
                  {t.type === 'EARN_PURCHASE' ? 'Points gagnés' : t.type === 'REDEEM_VOUCHER' ? 'Conversion en bon' : 'Ajustement'}
                </div>
                {t.reason && <div className="text-[12px] text-[var(--ink-500)] mt-0.5 truncate">{t.reason}</div>}
                <div className="text-[11px] text-[var(--ink-500)]/70 mt-0.5">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className={`text-base font-bold tabular-nums shrink-0 ${t.delta >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {t.delta >= 0 ? '+' : ''}{fmt(t.delta)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.1] py-10 text-center">
          <p className="text-sm text-[var(--ink-500)]">Aucun mouvement de points pour le moment.</p>
        </div>
      )}
    </div>
  )
}
