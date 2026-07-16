'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Se connecter</h1>
        <p className="text-sm text-[#1a1a1a]/50 mb-8">Accédez à votre espace client Obooking Gift.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loginMut.isPending}
            className="w-full bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-md py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {loginMut.isPending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6 text-xs">
          <Link href="/client/reset-password" className="text-[#1a1a1a]/50 hover:text-[#1a1a1a]">
            Mot de passe oublié ?
          </Link>
          <Link href="/client/signup" className="text-[#FF6B47] hover:underline font-medium">
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  )
}
