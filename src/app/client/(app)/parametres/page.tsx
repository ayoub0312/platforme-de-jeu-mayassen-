'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'

export default function ParametresPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const changePasswordMut = trpc.changeMyPassword.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await changePasswordMut.mutateAsync(form)
      setForm({ currentPassword: '', newPassword: '' })
      setSaved(true)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Paramètres</h1>
      <p className="text-sm text-[#1a1a1a]/50 mb-8">Sécurité de votre compte.</p>

      <h2 className="text-sm font-medium text-[#1a1a1a] mb-4">Changer de mot de passe</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Mot de passe actuel</label>
          <input
            type="password"
            required
            value={form.currentPassword}
            onChange={(e) => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Nouveau mot de passe</label>
          <input
            type="password"
            required
            value={form.newPassword}
            onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
            className="w-full border border-black/[0.12] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B47]"
          />
          <p className="text-[11px] text-[#1a1a1a]/40 mt-1.5">Au moins 12 caractères, avec 3 types de caractères différents.</p>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={changePasswordMut.isPending}
          className="bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-md px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {changePasswordMut.isPending ? 'Mise à jour…' : 'Mettre à jour'}
        </button>
        {saved && <span className="text-xs text-[#1a1a1a]/50 ml-3">Mot de passe mis à jour.</span>}
      </form>
    </div>
  )
}
