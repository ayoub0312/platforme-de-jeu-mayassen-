'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'

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
      const res = await loginMut.mutateAsync({ email, password })
      document.cookie = `customer_session=${res.token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Strict`
      router.push('/client/mes-informations')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Adresse email ou mot de passe incorrect.')
    }
  }

  const labelCls = 'block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-1.5'
  const inputCls = 'w-full h-11 bg-[var(--surface-alt)] border border-black/[0.08] rounded-xl px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/25 focus:border-[var(--brand-500)] transition-shadow'

  return (
    <div className="relative z-10 min-h-screen bg-[var(--surface-alt)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-lg bg-[var(--brand-500)] flex items-center justify-center text-white font-display font-semibold" aria-hidden="true">O</div>
          <span className="font-display text-lg font-semibold text-[var(--ink-900)]">Obooking Gift</span>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-md)] overflow-hidden">
          <div className="h-1 bg-[var(--brand-500)]" aria-hidden="true" />
          <div className="p-7">
            <h1 className="font-display text-2xl font-semibold text-[var(--ink-900)]">Se connecter</h1>
            <p className="text-sm text-[var(--ink-500)] mt-1 mb-6">Accédez à votre espace fidélité.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mot de passe</label>
                <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
              </div>

              {error && (
                <p className="text-[13px] font-medium text-[var(--danger)] bg-[var(--danger)]/[0.07] border border-[var(--danger)]/20 rounded-xl px-3.5 py-2.5">{error}</p>
              )}

              <button
                type="submit"
                disabled={loginMut.isPending}
                className="w-full h-11 bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {loginMut.isPending ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6 text-[13px]">
              <Link href="/client/reset-password" className="text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors">
                Mot de passe oublié ?
              </Link>
              <Link href="/client/signup" className="font-bold text-[var(--brand-700)] hover:underline">
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
