'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { trpc } from '@/utils/trpc'

const fieldClass =
  'w-full h-11 px-3.5 rounded-xl border border-black/[0.08] bg-[var(--surface-alt)] text-sm text-[var(--ink-900)] placeholder:text-[var(--ink-500)]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/25 focus:border-[var(--brand-500)]'

export default function MesInformationsPage() {
  const { data: profile, isLoading, refetch } = trpc.getMyProfile.useQuery()
  const updateMut = trpc.updateMyProfile.useMutation()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' })
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(false)
    await updateMut.mutateAsync(form)
    setSaved(true)
    refetch()
  }

  if (isLoading) {
    return (
      <div>
        <div className="h-7 w-56 rounded skeleton-shimmer mb-2" />
        <div className="h-4 w-40 rounded skeleton-shimmer mb-8" />
        <div className="h-72 rounded-2xl skeleton-shimmer max-w-xl" />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Mes informations</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1.5 max-w-lg">Votre profil personnel et vos coordonnées de contact.</p>
      </header>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        {/* Identité */}
        <section className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-sm)] p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-4">Identité</h2>
          <div>
            <label htmlFor="name" className="block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-2">Nom</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={fieldClass}
            />
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-[var(--shadow-premium-sm)] p-6 space-y-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)]">Contact</h2>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-2">Email</label>
            <div className="w-full h-11 px-3.5 flex items-center rounded-xl border border-black/[0.08] bg-[var(--surface-alt)] text-sm font-mono text-[var(--ink-500)]">
              {profile?.email}
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--ink-500)] mb-2">Téléphone</label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={fieldClass}
            />
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={updateMut.isPending}
            className="h-11 inline-flex items-center justify-center bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-xl px-6 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--success)]">
              <Check className="h-4 w-4" /> Enregistré
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
