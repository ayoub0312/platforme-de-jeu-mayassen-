'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthShell, AuthError, AuthSuccess, authFieldCls, authLabelCls, authPrimaryBtnCls, authLinkCls } from '@/components/AuthShell'

export default function ClientSignupPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const registerMut = trpc.registerCustomer.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await registerMut.mutateAsync(form)
      setSubmitted(res.message)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    }
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Suivez vos jeux, vos achats et vos points en un seul endroit."
      footer={
        <>
          Déjà un compte ?{' '}
          <Link href="/client/login" className={authLinkCls}>Se connecter</Link>
        </>
      }
    >
      {submitted ? (
        <AuthSuccess>
          <p>{submitted}</p>
          <Link href="/client/login" className="mt-3 inline-flex h-9 items-center px-4 btn-game text-sm">
            Aller à la connexion
          </Link>
        </AuthSuccess>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label htmlFor="cs-name" className={authLabelCls}>Nom</label>
              <input id="cs-name" type="text" autoComplete="name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={authFieldCls} />
            </div>
            <div className="min-w-0">
              <label htmlFor="cs-phone" className={authLabelCls}>Téléphone</label>
              <input id="cs-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className={authFieldCls} />
            </div>
          </div>
          <div>
            <label htmlFor="cs-email" className={authLabelCls}>Email</label>
            <input id="cs-email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={authFieldCls} />
          </div>
          <div>
            <label htmlFor="cs-password" className={authLabelCls}>Mot de passe</label>
            <PasswordInput id="cs-password" required autoComplete="new-password" aria-describedby="cs-password-help" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className={authFieldCls} />
            <p id="cs-password-help" className="text-xs text-ink-500 mt-1.5">12 caractères minimum, avec 3 types de caractères différents.</p>
          </div>

          {error && <AuthError>{error}</AuthError>}

          <button type="submit" disabled={registerMut.isPending} className={authPrimaryBtnCls}>
            {registerMut.isPending ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
