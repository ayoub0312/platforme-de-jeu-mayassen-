'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'

export default function ClientResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
    <div className="relative z-10 min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Mot de passe oublié</h1>
        <p className="text-sm text-[#1a1a1a]/50 mb-8">Saisissez votre email pour recevoir un lien de réinitialisation.</p>

        {submitted ? (
          <p className="text-sm text-[#1a1a1a] border border-black/[0.12] rounded-md p-4">{submitted}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
            />
            <button
              type="submit"
              disabled={requestMut.isPending}
              className="w-full bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-md py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {requestMut.isPending ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <Link href="/client/login" className="text-xs text-[#1a1a1a]/50 hover:text-[#1a1a1a] mt-6 inline-block">
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )
}

function CompleteReset({ token }: { token: string }) {
  const router = useRouter()
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
      <div className="relative z-10 min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-[#1a1a1a] mb-3">Mot de passe mis à jour</h1>
          <Link href="/client/login" className="text-sm text-[#FF6B47] hover:underline font-medium">
            Se connecter →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Choisir un nouveau mot de passe</h1>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Au moins 12 caractères"
            className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={resetMut.isPending}
            className="w-full bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-md py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {resetMut.isPending ? 'Mise à jour…' : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </div>
  )
}
