'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'

export default function PartnerSignupPage() {
  const [form, setForm] = useState({ agencyName: '', email: '', password: '', phone: '', contactName: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const registerMut = trpc.registerPartner.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await registerMut.mutateAsync(form)
      setSubmitted(res.message)
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.")
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <Link href="/partner" className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#FF6B47] transition-all mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à la connexion
      </Link>
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-slate-200/85 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-400/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-orange-500/10 rounded-2xl mb-4 border border-orange-500/15">
              <ShieldAlert className="h-8 w-8 text-[#FF6B47]" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">
              Créer un espace partenaire
            </h1>
            <p className="text-slate-400 text-xs mt-1 text-center font-medium">
              Votre demande sera examinée par notre équipe avant activation.
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
              <p className="text-sm text-slate-700 font-semibold">{submitted}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Nom de l'agence</label>
                <input
                  type="text"
                  required
                  value={form.agencyName}
                  onChange={(e) => setForm(f => ({ ...f, agencyName: e.target.value }))}
                  placeholder="Ex: Gourmet Bistro"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Nom du contact</label>
                <input
                  type="text"
                  required
                  value={form.contactName}
                  onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Email professionnel</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@agence.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Mot de passe</label>
                <PasswordInput
                  required
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Au moins 12 caractères"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                  Au moins 12 caractères, combinant minuscules/majuscules/chiffres/symboles.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={registerMut.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#FF6B47] hover:bg-[#E85530] disabled:bg-orange-400 text-white rounded-xl text-sm font-black transition-all cursor-pointer shadow-md shadow-orange-500/10 active:scale-98"
              >
                {registerMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Envoyer ma demande'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
