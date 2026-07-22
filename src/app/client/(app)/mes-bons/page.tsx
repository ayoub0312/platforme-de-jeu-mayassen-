'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Actif', cls: 'bg-green-100 text-green-700 border-green-200' },
  REDEEMED: { label: 'Utilisé', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  EXPIRED: { label: 'Expiré', cls: 'bg-red-50 text-red-500 border-red-150' },
}

export default function MesBonsPage() {
  const { data: vouchers, isLoading } = trpc.getMyVouchers.useQuery()
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mes bons de réduction</h1>
      <p className="text-sm text-[#1a1a1a]/50 mb-6">Vos codes générés en convertissant vos points merci. Utilisez-les sur obooking.tn.</p>

      {isLoading ? (
        <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>
      ) : vouchers && vouchers.length > 0 ? (
        <div className="space-y-3">
          {vouchers.map((v) => {
            const st = STATUS_LABEL[v.status] || STATUS_LABEL.ACTIVE
            const usable = v.status === 'ACTIVE'
            return (
              <div key={v.id} className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${usable ? 'border-[#FF6B47]/30 bg-[#FF6B47]/5' : 'border-black/[0.08] opacity-70'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono tracking-widest text-[#1a1a1a]">{v.code}</span>
                    {usable && (
                      <button onClick={() => copy(v.code)} className="text-[11px] font-bold text-[#FF6B47] border border-[#FF6B47]/30 rounded px-1.5 py-0.5 hover:bg-[#FF6B47]/10">
                        {copied === v.code ? '✓' : 'Copier'}
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-[#1a1a1a]/50 mt-1">
                    {v.pointsSpent.toLocaleString('fr-FR')} points · valable jusqu'au {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('fr-FR') : '—'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black text-[#FF6B47]">{v.valueTnd.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND</div>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="border border-black/[0.08] rounded-xl p-8 text-center">
          <p className="text-sm text-[#1a1a1a]/50">Vous n'avez pas encore de bon.</p>
          <a href="/client/mes-points" className="inline-block mt-3 text-sm font-bold text-[#FF6B47] hover:underline">Convertir mes points →</a>
        </div>
      )}
    </div>
  )
}
