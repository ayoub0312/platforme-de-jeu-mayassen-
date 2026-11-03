'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthShell, AuthError, AuthSuccess, authFieldCls, authLabelCls, authPrimaryBtnCls, authLinkCls } from '@/components/AuthShell'

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
    <AuthShell
      title="Créer un espace partenaire"
      subtitle="Lancez vos roulettes et tirages au sort. Votre demande est validée par notre équipe avant activation."
      backHref="/partner"
      backLabel="J'ai déjà un compte"
      footer={
        <>
          Déjà partenaire ?{' '}
          <Link href="/partner" className={authLinkCls}>Se connecter</Link>
        </>
      }
    >
      {submitted ? (
        <AuthSuccess>{submitted}</AuthSuccess>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ps-agency" className={authLabelCls}>Nom de l&apos;établissement</label>
            <input
              id="ps-agency"
              type="text"
              required
              autoComplete="organization"
              value={form.agencyName}
              onChange={(e) => setForm((f) => ({ ...f, agencyName: e.target.value }))}
              className={authFieldCls}
            />
          </div>
          <div>
            <label htmlFor="ps-contact" className={authLabelCls}>Nom du contact</label>
            <input
              id="ps-contact"
              type="text"
              required
              autoComplete="name"
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              className={authFieldCls}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label htmlFor="ps-email" className={authLabelCls}>Email professionnel</label>
              <input
                id="ps-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={authFieldCls}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="ps-phone" className={authLabelCls}>Téléphone</label>
              <input
                id="ps-phone"
                type="tel"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={authFieldCls}
              />
            </div>
          </div>
          <div>
            <label htmlFor="ps-password" className={authLabelCls}>Mot de passe</label>
            <PasswordInput
              id="ps-password"
              required
              autoComplete="new-password"
              aria-describedby="ps-password-help"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={authFieldCls}
            />
            <p id="ps-password-help" className="text-xs text-ink-500 mt-1.5">
              12 caractères minimum, avec au moins 3 types parmi minuscules, majuscules, chiffres et symboles.
            </p>
          </div>

          {error && <AuthError>{error}</AuthError>}

          <button type="submit" disabled={registerMut.isPending} className={authPrimaryBtnCls}>
            {registerMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Envoyer ma demande'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
