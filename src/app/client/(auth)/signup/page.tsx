'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'

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
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Créer un compte client</h1>
        <p className="text-sm text-[#1a1a1a]/50 mb-8">Suivez vos jeux, vos achats et vos points en un seul endroit.</p>

        {submitted ? (
          <div className="border border-black/[0.12] rounded-md p-4">
            <p className="text-sm text-[#1a1a1a]">{submitted}</p>
            <Link href="/client/login" className="text-sm text-[#FF6B47] hover:underline font-medium mt-3 inline-block">
              Aller à la connexion →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
              />
              <p className="text-[11px] text-[#1a1a1a]/40 mt-1.5">Au moins 12 caractères, avec 3 types de caractères différents.</p>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={registerMut.isPending}
              className="w-full bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-md py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {registerMut.isPending ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
        )}

        <p className="text-xs text-[#1a1a1a]/50 mt-6">
          Déjà un compte ?{' '}
          <Link href="/client/login" className="text-[#FF6B47] hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
