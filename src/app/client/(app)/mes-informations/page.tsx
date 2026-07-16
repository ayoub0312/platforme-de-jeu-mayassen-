'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/utils/trpc'

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

  if (isLoading) return <p className="text-sm text-[#1a1a1a]/40">Chargement…</p>

  return (
    <div className="max-w-md">
      <h1 className="text-lg font-semibold text-[#1a1a1a] mb-1">Mes informations</h1>
      <p className="text-sm text-[#1a1a1a]/50 mb-8">Votre profil personnel.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5">Email</label>
          <div className="w-full border border-black/[0.08] bg-black/[0.02] rounded-md px-3 py-2.5 text-sm font-mono text-[#1a1a1a]/70">
            {profile?.email}
          </div>
        </div>
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

        <button
          type="submit"
          disabled={updateMut.isPending}
          className="bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-md px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && <span className="text-xs text-[#1a1a1a]/50 ml-3">Enregistré.</span>}
      </form>
    </div>
  )
}
