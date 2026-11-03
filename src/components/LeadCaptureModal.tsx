'use client'

import React, { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { Gift, RefreshCw, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface LeadCaptureModalProps {
  campaignId: string
  partnerId: string
  referredByCode?: string
  gameMode?: 'ROULETTE' | 'DRAW'
  onSuccess: (email: string, userName: string, initialTokens: number) => void
}

export function LeadCaptureModal({ campaignId, partnerId, referredByCode, gameMode = 'ROULETTE', onSuccess }: LeadCaptureModalProps) {
  const isDraw = gameMode === 'DRAW'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const toast = useToast()
  const leadMutation = trpc.captureLead.useMutation()
  const { data: siteSettings } = trpc.getSiteSettings.useQuery()
  const referralBonusSpins = siteSettings?.referralBonusSpins ?? 2

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !name) return

    leadMutation.mutate(
      {
        email,
        name,
        phone: phone || undefined,
        campaignId,
        partnerId,
        source: 'LINK',
        referredByCode: referredByCode || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(
            data.tokensCount > 0
              ? `Inscription réussie ! Vous avez ${data.tokensCount} lancer${data.tokensCount > 1 ? 's' : ''}.`
              : 'Inscription réussie !'
          )
          onSuccess(email, data.user.name || name, data.tokensCount)
        },
      }
    )
  }

  const fieldCls = 'w-full h-11 bg-surface border border-field hover:border-ink-700 text-ink-900 placeholder:text-ink-500 px-3.5 rounded-[10px] text-[15px] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors disabled:opacity-50'
  const labelCls = 'block text-[13px] font-medium text-ink-700 mb-1.5'

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-ink-900 tracking-tight">{isDraw ? 'Participez au tirage' : 'Recevez vos lancers'}</h3>
        <p className="text-ink-700 text-[15px] mt-1.5 leading-relaxed">
          {isDraw
            ? 'Inscrivez-vous pour accéder au tirage au sort et tenter de remporter un lot.'
            : 'Inscrivez-vous pour obtenir vos lancers gratuits et tenter de remporter un lot.'}
        </p>

        {referredByCode && (
          <p className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-brand-50 text-[13px] text-brand-700">
            <Gift className="h-3.5 w-3.5" aria-hidden="true" />
            Invitation active : {referralBonusSpins} lancer{referralBonusSpins > 1 ? 's' : ''} bonus pour votre parrain
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="lead-name" className={labelCls}>Nom complet</label>
          <input
            id="lead-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={leadMutation.isPending}
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="lead-email" className={labelCls}>Adresse email</label>
          <input
            id="lead-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={leadMutation.isPending}
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="lead-phone" className={labelCls}>
            Téléphone <span className="font-normal text-ink-500">(facultatif)</span>
          </label>
          <input
            id="lead-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={leadMutation.isPending}
            className={fieldCls}
          />
        </div>

        {leadMutation.isError && (
          <div role="alert" className="flex items-start gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--danger)]/[0.06] border border-[var(--danger)]/20 text-[var(--danger)] text-[13px]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{leadMutation.error.message || "Impossible de valider votre inscription pour le moment. Réessayez."}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={leadMutation.isPending}
          className="w-full h-12 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-full font-semibold text-[15px] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {leadMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Inscription…
            </>
          ) : (
            isDraw ? 'Continuer' : 'Obtenir mes lancers'
          )}
        </button>
      </form>
    </div>
  )
}
