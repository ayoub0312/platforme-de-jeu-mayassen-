'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'

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
            <h1 className="font-display text-2xl font-semibold text-[var(--ink-900)]">Créer un compte</h1>
            <p className="text-sm text-[var(--ink-500)] mt-1 mb-6">Suivez vos jeux, vos achats et vos points en un seul endroit.</p>

            {submitted ? (
              <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/[0.07] p-4">
                <div className="flex items-center gap-2 text-[var(--success)]">
                  <Check className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-medium">{submitted}</p>
                </div>
                <Link href="/client/login" className="text-sm font-bold text-[var(--brand-700)] hover:underline mt-3 inline-block">
                  Aller à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>Nom</label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Mot de passe</label>
                  <PasswordInput required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
                  <p className="text-[11px] text-[var(--ink-500)] mt-1.5">Au moins 12 caractères, avec 3 types de caractères différents.</p>
                </div>

                {error && (
                  <p className="text-[13px] font-medium text-[var(--danger)] bg-[var(--danger)]/[0.07] border border-[var(--danger)]/20 rounded-xl px-3.5 py-2.5">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={registerMut.isPending}
                  className="w-full h-11 bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {registerMut.isPending ? 'Création…' : 'Créer mon compte'}
                </button>
              </form>
            )}

            <p className="text-[13px] text-[var(--ink-500)] mt-6">
              Déjà un compte ?{' '}
              <Link href="/client/login" className="font-bold text-[var(--brand-700)] hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
