'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'

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

  const inputClass =
    'w-full h-11 px-3.5 rounded-xl border border-black/[0.08] bg-[var(--surface-alt)] text-sm text-[var(--ink-900)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/25 focus:border-[var(--brand-500)]'

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Paramètres</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1.5 max-w-lg">Gérez la sécurité de votre compte.</p>
      </header>

      <section className="max-w-md rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-sm)] p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-5">Changer de mot de passe</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-2">Mot de passe actuel</label>
            <PasswordInput
              required
              value={form.currentPassword}
              onChange={(e) => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-2">Nouveau mot de passe</label>
            <PasswordInput
              required
              value={form.newPassword}
              onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
              className={inputClass}
            />
            <p className="text-[12px] text-[var(--ink-500)] mt-2">Au moins 12 caractères, avec 3 types de caractères différents.</p>
          </div>

          {error && (
            <div className="text-[13px] font-medium text-[var(--danger)] bg-[var(--danger)]/[0.07] border border-[var(--danger)]/20 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={changePasswordMut.isPending}
              className="h-11 inline-flex items-center justify-center bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-xl px-6 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {changePasswordMut.isPending ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--success)]">
                <Check className="h-4 w-4" /> Mot de passe mis à jour
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
