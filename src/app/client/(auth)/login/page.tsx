'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthShell, AuthError, authFieldCls, authLabelCls, authPrimaryBtnCls, authLinkCls } from '@/components/AuthShell'

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const loginMut = trpc.loginCustomer.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      // Le cookie de session (HttpOnly) est posé par le serveur dans la réponse.
      await loginMut.mutateAsync({ email, password })
      router.push('/client/mes-informations')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Adresse email ou mot de passe incorrect.')
    }
  }

  return (
    <AuthShell
      title="Se connecter"
      subtitle="Retrouvez vos jeux, vos bons et vos points fidélité."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/client/signup" className={authLinkCls}>Créer un compte</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="client-email" className={authLabelCls}>Email</label>
          <input id="client-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authFieldCls} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="client-password" className={authLabelCls}>Mot de passe</label>
            <Link href="/client/reset-password" className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput id="client-password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authFieldCls} />
        </div>

        {error && <AuthError>{error}</AuthError>}

        <button type="submit" disabled={loginMut.isPending} className={authPrimaryBtnCls}>
          {loginMut.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthShell>
  )
}
