'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'

const labelCls = 'block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-1.5'
const inputCls = 'w-full h-11 bg-[var(--surface-alt)] border border-black/[0.08] rounded-xl px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/25 focus:border-[var(--brand-500)] transition-shadow'

// Cadre commun des écrans d'authentification (fond, logo, carte).
function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-alt)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-lg bg-[var(--brand-500)] flex items-center justify-center text-white font-display font-semibold" aria-hidden="true">O</div>
          <span className="font-display text-lg font-semibold text-[var(--ink-900)]">Obooking Gift</span>
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-md)] overflow-hidden">
          <div className="h-1 bg-[var(--brand-500)]" aria-hidden="true" />
          <div className="p-7">
            <h1 className="font-display text-2xl font-semibold text-[var(--ink-900)]">{title}</h1>
            {subtitle && <p className="text-sm text-[var(--ink-500)] mt-1 mb-6">{subtitle}</p>}
            <div className={subtitle ? '' : 'mt-6'}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const primaryBtn = 'w-full h-11 bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50'
const errorBox = 'text-[13px] font-medium text-[var(--danger)] bg-[var(--danger)]/[0.07] border border-[var(--danger)]/20 rounded-xl px-3.5 py-2.5'

export default function ClientResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  if (token) {
    return <CompleteReset token={token} />
  }
  return <RequestReset />
}

function RequestReset() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  const requestMut = trpc.requestCustomerPasswordReset.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await requestMut.mutateAsync({ email })
    setSubmitted(res.message)
  }

  return (
    <AuthCard title="Mot de passe oublié" subtitle="Saisissez votre email pour recevoir un lien de réinitialisation.">
      {submitted ? (
        <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/[0.07] p-4 flex items-start gap-2 text-[var(--success)]">
          <Check className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{submitted}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className={inputCls} />
          </div>
          <button type="submit" disabled={requestMut.isPending} className={primaryBtn}>
            {requestMut.isPending ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
      )}
      <Link href="/client/login" className="text-[13px] text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors mt-6 inline-block">
        ← Retour à la connexion
      </Link>
    </AuthCard>
  )
}

function CompleteReset({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const resetMut = trpc.resetCustomerPasswordWithToken.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await resetMut.mutateAsync({ token, newPassword })
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Ce lien est invalide ou a expiré.')
    }
  }

  if (done) {
    return (
      <AuthCard title="Mot de passe mis à jour">
        <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/[0.07] p-4 flex items-center gap-2 text-[var(--success)]">
          <Check className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Votre mot de passe a bien été modifié.</p>
        </div>
        <Link href="/client/login" className="font-bold text-[var(--brand-700)] hover:underline mt-4 inline-block text-sm">
          Se connecter
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Nouveau mot de passe">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Nouveau mot de passe</label>
          <PasswordInput required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Au moins 12 caractères" className={inputCls} />
        </div>
        {error && <p className={errorBox}>{error}</p>}
        <button type="submit" disabled={resetMut.isPending} className={primaryBtn}>
          {resetMut.isPending ? 'Mise à jour…' : 'Mettre à jour'}
        </button>
      </form>
    </AuthCard>
  )
}
