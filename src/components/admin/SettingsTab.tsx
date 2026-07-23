'use client'

import { useEffect, useState } from 'react'
import { Gift, Mail, Save, KeyRound } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export function SettingsTab() {
  const toast = useToast()
  const { data: settings, refetch } = trpc.getSiteSettings.useQuery()
  const updateMut = trpc.updateGlobalSettings.useMutation()

  const [referralBonusSpins, setReferralBonusSpins] = useState(2)
  const [defaultSenderEmail, setDefaultSenderEmail] = useState('')
  const [defaultSenderEmailPassword, setDefaultSenderEmailPassword] = useState('')

  // Section "Mon compte" — modification de l'email / mot de passe du super admin.
  const accountMut = trpc.updateMyAdminAccount.useMutation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleSaveAccount = async () => {
    if (!currentPassword) {
      toast.error('Renseignez votre mot de passe actuel.')
      return
    }
    if (!newEmail && !newPassword) {
      toast.error('Renseignez un nouvel email ou un nouveau mot de passe.')
      return
    }
    try {
      const res = await accountMut.mutateAsync({
        currentPassword,
        newEmail: newEmail.trim() || undefined,
        newPassword: newPassword || undefined,
      })
      setCurrentPassword('')
      setNewEmail('')
      setNewPassword('')
      if (res.emailChanged) {
        toast.success('Compte mis à jour. Reconnectez-vous avec votre nouvel email.')
      } else {
        toast.success('Mot de passe mis à jour.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour du compte.')
    }
  }

  useEffect(() => {
    if (!settings) return
    setReferralBonusSpins(settings.referralBonusSpins ?? 2)
    setDefaultSenderEmail(settings.defaultSenderEmail || '')
  }, [settings])

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({
        referralBonusSpins,
        defaultSenderEmail: defaultSenderEmail || null,
        defaultSenderEmailPassword: defaultSenderEmailPassword || null,
      })
      setDefaultSenderEmailPassword('')
      toast.success('Réglages enregistrés.')
      refetch()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement des réglages.")
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2 mb-1">
          <Gift className="h-5 w-5 text-brand-500" /> Parrainage
        </h3>
        <p className="text-ink-500 text-xs font-semibold mb-5">
          Nombre de lancers offerts au parrain lorsqu'un filleul s'inscrit via son lien.
        </p>
        <Input
          type="number"
          min={0}
          max={20}
          label="Lancers bonus par parrainage réussi"
          value={referralBonusSpins}
          onChange={(e) => setReferralBonusSpins(Math.max(0, Math.min(20, Number(e.target.value))))}
          className="max-w-[160px]"
        />
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5 text-brand-500" /> Email d'envoi par défaut
        </h3>
        <p className="text-ink-500 text-xs font-semibold mb-5">
          Utilisée pour notifier les gagnants quand une campagne n'a pas sa propre adresse configurée. Envoyée via Resend.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="email"
            label="Adresse d'envoi"
            placeholder="gift@obooking.tn"
            value={defaultSenderEmail}
            onChange={(e) => setDefaultSenderEmail(e.target.value)}
          />
          <Input
            type="password"
            label={`Clé API Resend${settings?.hasDefaultSenderEmailPassword ? ' (déjà configurée)' : ''}`}
            placeholder={settings?.hasDefaultSenderEmailPassword ? '••••••••••••••••' : 're_xxxxxxxxxxxxxxxx'}
            value={defaultSenderEmailPassword}
            onChange={(e) => setDefaultSenderEmailPassword(e.target.value)}
          />
        </div>
        <p className="text-[10px] text-ink-500 mt-2 font-semibold">
          Laissez la clé vide pour conserver celle déjà enregistrée. L'adresse d'envoi doit être sur un domaine{' '}
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
            vérifié dans Resend
          </a>.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={updateMut.isPending}>
          <Save className="h-4 w-4" /> Enregistrer les réglages
        </Button>
      </div>

      {/* Mon compte : email + mot de passe du super admin */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2 mb-1">
          <KeyRound className="h-5 w-5 text-brand-500" /> Mon compte
        </h3>
        <p className="text-ink-500 text-xs font-semibold mb-5">
          Modifiez votre adresse email et/ou votre mot de passe de connexion. Votre mot de passe actuel est requis pour valider.
        </p>

        <div className="space-y-4">
          <Input
            type="password"
            label="Mot de passe actuel *"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="max-w-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="email"
              label="Nouvel email (laisser vide pour ne pas changer)"
              placeholder="admin@agency.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Input
              type="password"
              label="Nouveau mot de passe (min. 8 car.)"
              placeholder="Laisser vide pour ne pas changer"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <Button onClick={handleSaveAccount} loading={accountMut.isPending}>
            <KeyRound className="h-4 w-4" /> Mettre à jour mon compte
          </Button>
        </div>
      </Card>
    </div>
  )
}
