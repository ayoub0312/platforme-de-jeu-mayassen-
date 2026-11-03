'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthShell, authFieldCls, authLabelCls, authPrimaryBtnCls } from '@/components/AuthShell'

const labelCls = authLabelCls
const inputCls = authFieldCls
const primaryBtn = authPrimaryBtnCls
const errorBox = 'text-[13px] text-[var(--danger)] bg-[var(--danger)]/[0.06] border border-[var(--danger)]/20 rounded-[10px] px-3 py-2.5'

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <AuthShell title={title} subtitle={subtitle} backHref="/client/login" backLabel="Connexion">
      {children}
    </AuthShell>
  )
}

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
        <div role="status" className="rounded-[10px] border border-[var(--success)]/25 bg-[var(--success)]/[0.07] px-4 py-3.5 flex items-start gap-2 text-ink-900">
          <Check className="h-4 w-4 shrink-0 mt-0.5 text-[var(--success)]" />
          <p className="text-sm font-medium">{submitted}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className={labelCls}>Email</label>
            <input id="reset-email" autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className={inputCls} />
          </div>
          <button type="submit" disabled={requestMut.isPending} className={primaryBtn}>
            {requestMut.isPending ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
      )}
      <Link href="/client/login" className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors mt-6 inline-block">
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
        <div role="status" className="rounded-[10px] border border-[var(--success)]/25 bg-[var(--success)]/[0.07] px-4 py-3.5 flex items-center gap-2 text-ink-900">
          <Check className="h-4 w-4 shrink-0 text-[var(--success)]" />
          <p className="text-sm font-medium">Votre mot de passe a bien été modifié.</p>
        </div>
        <Link href="/client/login" className="mt-4 inline-flex h-10 items-center px-4 btn-game text-sm">
          Se connecter
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Nouveau mot de passe">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-new" className={labelCls}>Nouveau mot de passe</label>
          <PasswordInput id="reset-new" autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Au moins 12 caractères" className={inputCls} />
        </div>
        {error && <p className={errorBox}>{error}</p>}
        <button type="submit" disabled={resetMut.isPending} className={primaryBtn}>
          {resetMut.isPending ? 'Mise à jour…' : 'Mettre à jour'}
        </button>
      </form>
    </AuthCard>
  )
}
