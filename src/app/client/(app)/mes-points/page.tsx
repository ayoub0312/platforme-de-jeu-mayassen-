'use client'

import { useState } from 'react'
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
  const [generated, setGenerated] = useState<{ code: string; valueTnd: number; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const value = redeemRate > 0 ? Math.floor((amount / redeemRate) * 100) / 100 : 0
  const canRedeem = enabled && amount >= minRedeem && amount <= balance && value > 0

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

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mes points merci</h1>
      <p className="text-sm text-[#1a1a1a]/50 mb-6">Cumulez des points à chaque achat et convertissez-les en bons de réduction.</p>

      {/* Solde */}
      {isLoading ? (
        <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
      ) : (
        <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-[#FF6B47] to-[#E85530] text-white shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/80">Solde disponible</div>
          <div className="text-4xl font-black mt-1">{balance.toLocaleString('fr-FR')} <span className="text-lg font-bold">points</span></div>
          {enabled && (
            <div className="text-xs text-white/80 mt-2">
              ≈ {(redeemRate > 0 ? Math.floor((balance / redeemRate) * 100) / 100 : 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND convertibles
            </div>
          )}
        </div>
      )}

      {/* Conversion */}
      {!enabled ? (
        <div className="border border-black/[0.08] rounded-md p-6 mb-6 text-sm text-[#1a1a1a]/50">
          Le programme de fidélité est actuellement désactivé. Revenez bientôt.
        </div>
      ) : (
        <div className="border border-black/[0.08] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-1">Convertir mes points en bon de réduction</h2>
          <p className="text-xs text-[#1a1a1a]/50 mb-4">
            {redeemRate} points = 1 TND · minimum {minRedeem} points par conversion
          </p>

          <label className="block text-xs font-bold text-[#1a1a1a]/60 uppercase mb-2">Points à convertir</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={balance}
              value={amount || ''}
              onChange={(e) => { setAmount(parseInt(e.target.value) || 0); setError(null) }}
              placeholder={`Min. ${minRedeem}`}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
            />
            <button
              onClick={() => setAmount(balance)}
              className="text-xs font-bold text-[#FF6B47] hover:underline whitespace-nowrap"
            >
              Tout ({balance})
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 p-3 bg-slate-50 rounded-lg">
            <span className="text-xs font-semibold text-[#1a1a1a]/60">Valeur du bon</span>
            <span className="text-xl font-black text-[#FF6B47]">{value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND</span>
          </div>

          {error && <div className="mt-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-150 rounded-lg px-3 py-2">{error}</div>}

          <button
            onClick={handleRedeem}
            disabled={!canRedeem || redeemMut.isPending}
            className="mt-4 w-full py-3 bg-[#FF6B47] hover:bg-[#E85530] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all"
          >
            {redeemMut.isPending ? 'Conversion…' : 'Générer mon bon de réduction'}
          </button>

          {/* Bon généré */}
          {generated && (
            <div className="mt-4 border-2 border-dashed border-[#FF6B47]/40 bg-[#FF6B47]/5 rounded-xl p-4 text-center">
              <div className="text-xs font-semibold text-[#1a1a1a]/60 mb-1">Votre code de réduction de {generated.valueTnd.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND</div>
              <div className="flex items-center justify-center gap-2 my-2">
                <span className="text-2xl font-black font-mono tracking-widest text-[#1a1a1a]">{generated.code}</span>
                <button onClick={copyCode} className="text-xs font-bold text-[#FF6B47] border border-[#FF6B47]/30 rounded-md px-2 py-1 hover:bg-[#FF6B47]/10">
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
              <div className="text-[11px] text-[#1a1a1a]/50">
                À utiliser sur obooking.tn lors de votre prochain achat · valable jusqu'au {new Date(generated.expiresAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historique */}
      <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Historique des points</h2>
      {history && history.length > 0 ? (
        <div className="border border-black/[0.08] rounded-xl divide-y divide-black/[0.06]">
          {history.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-[#1a1a1a]">
                  {t.type === 'EARN_PURCHASE' ? 'Points gagnés (achat)' : t.type === 'REDEEM_VOUCHER' ? 'Conversion en bon' : 'Ajustement'}
                </div>
                {t.reason && <div className="text-[11px] text-[#1a1a1a]/50 mt-0.5">{t.reason}</div>}
                <div className="text-[11px] text-[#1a1a1a]/40 mt-0.5">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className={`text-sm font-black ${t.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {t.delta >= 0 ? '+' : ''}{t.delta.toLocaleString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#1a1a1a]/40">Aucun mouvement de points pour le moment.</p>
      )}
    </div>
  )
}
