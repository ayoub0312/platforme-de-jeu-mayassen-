'use client'

import { useState } from 'react'
import { Ticket, Check, Copy } from 'lucide-react'
import { trpc } from '@/utils/trpc'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Actif', cls: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20' },
  REDEEMED: { label: 'Utilisé', cls: 'bg-black/[0.04] text-[var(--ink-500)] border-black/10' },
  EXPIRED: { label: 'Expiré', cls: 'bg-black/[0.04] text-[var(--ink-500)] border-black/10' },
}

export default function MesBonsPage() {
  const { data: vouchers, isLoading } = trpc.getMyVouchers.useQuery()
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR')
  const fmtTnd = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Mes bons de réduction</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1.5 max-w-lg">
          Vos codes générés en convertissant vos points merci. Utilisez-les lors de votre prochain achat sur obooking.tn.
        </p>
      </header>

      {isLoading ? (
        <div className="h-40 rounded-2xl skeleton-shimmer" />
      ) : vouchers && vouchers.length > 0 ? (
        <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] divide-y divide-black/[0.05] overflow-hidden">
          {vouchers.map((v) => {
            const st = STATUS_LABEL[v.status] || STATUS_LABEL.ACTIVE
            const usable = v.status === 'ACTIVE'
            return (
              <div key={v.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${usable ? '' : 'opacity-70'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-lg font-bold tracking-[0.12em] tabular-nums text-[var(--ink-900)]">{v.code}</span>
                    {usable && (
                      <button
                        type="button"
                        onClick={() => copy(v.code)}
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-700)] border border-[var(--brand-500)]/30 rounded-lg px-2 py-1 hover:bg-[var(--brand-50)] transition-colors"
                      >
                        {copied === v.code ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                      </button>
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--ink-500)] mt-1 tabular-nums">
                    {fmt(v.pointsSpent)} points · valable jusqu'au {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('fr-FR') : '—'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg font-semibold text-[var(--ink-900)] tabular-nums">{fmtTnd(v.valueTnd)} TND</div>
                  <span className={`inline-flex items-center mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.cls}`}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.1] py-10 px-6 text-center">
          <div className="h-11 w-11 rounded-xl bg-[var(--surface-alt)] flex items-center justify-center mx-auto mb-3">
            <Ticket className="h-5 w-5 text-[var(--ink-500)]" />
          </div>
          <p className="text-sm text-[var(--ink-500)]">Vous n'avez pas encore de bon de réduction.</p>
          <a href="/client/mes-points" className="inline-block mt-3 text-sm font-bold text-[var(--brand-700)] hover:underline">Convertir mes points</a>
        </div>
      )}
    </div>
  )
}
