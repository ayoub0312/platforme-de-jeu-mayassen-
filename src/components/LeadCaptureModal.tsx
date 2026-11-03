'use client'

import React, { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { Mail, User, Phone, Gift, Send, RefreshCw, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface LeadCaptureModalProps {
  campaignId: string
  partnerId: string
  referredByCode?: string
  onSuccess: (email: string, userName: string, initialTokens: number) => void
}

export function LeadCaptureModal({ campaignId, partnerId, referredByCode, onSuccess }: LeadCaptureModalProps) {
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

  return (
    <div className="w-full bg-white p-6 relative overflow-hidden">
      <div className="relative text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-orange-50 border border-orange-100 text-[#FF6B47] mb-3">
          <Gift className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-extrabold text-[#241F1C] tracking-tight">Tentez votre chance !</h3>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          Enregistrez vos coordonnées pour obtenir vos <span className="text-[#FF6B47] font-bold">lancers gratuits</span> et tenter de remporter un lot exceptionnel !
        </p>

        {referredByCode && (
          <div className="mt-3 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-xxs font-semibold text-[#FF6B47] inline-flex items-center gap-1.5">
            🎁 Parrainage actif : {referralBonusSpins} lancer{referralBonusSpins > 1 ? 's' : ''} bonus offert{referralBonusSpins > 1 ? 's' : ''} au parrain !
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name input */}
        <div className="relative">
          <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            required
            placeholder="Nom complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={leadMutation.isPending}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-11 pr-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] focus:border-[#FF6B47] transition-all disabled:opacity-50"
          />
        </div>

        {/* Email input */}
        <div className="relative">
          <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="email"
            required
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={leadMutation.isPending}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-11 pr-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] focus:border-[#FF6B47] transition-all disabled:opacity-50"
          />
        </div>

        {/* Phone input */}
        <div className="relative">
          <Phone className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="tel"
            placeholder="Numéro de téléphone (optionnel)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={leadMutation.isPending}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-11 pr-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] focus:border-[#FF6B47] transition-all disabled:opacity-50"
          />
        </div>

        {/* Error message display */}
        {leadMutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-650 text-xs">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span>{leadMutation.error.message || "Impossible de valider votre inscription pour le moment. Réessayez."}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={leadMutation.isPending || !email || !name}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#FF6B47] hover:bg-[#e85530] disabled:bg-slate-100 text-white disabled:text-slate-450 rounded-xl font-bold text-sm shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {leadMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
              Inscription en cours...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Obtenir mes lancers
            </>
          )}
        </button>
      </form>
    </div>
  )
}
