'use client'

import { useEffect, useState } from 'react'
import { Gift, Mail, Save } from 'lucide-react'
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
          Utilisée pour notifier les gagnants quand une campagne n'a pas sa propre adresse configurée.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="email"
            label="Adresse Gmail"
            placeholder="agence@gmail.com"
            value={defaultSenderEmail}
            onChange={(e) => setDefaultSenderEmail(e.target.value)}
          />
          <Input
            type="password"
            label={`Mot de passe d'application${settings?.hasDefaultSenderEmailPassword ? ' (déjà configuré)' : ''}`}
            placeholder={settings?.hasDefaultSenderEmailPassword ? '••••••••••••••••' : 'xxxx xxxx xxxx xxxx'}
            value={defaultSenderEmailPassword}
            onChange={(e) => setDefaultSenderEmailPassword(e.target.value)}
          />
        </div>
        <p className="text-[10px] text-ink-500 mt-2 font-semibold">
          Laissez le mot de passe vide pour conserver celui déjà enregistré. Générez un{' '}
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
            mot de passe d'application Google
          </a>.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={updateMut.isPending}>
          <Save className="h-4 w-4" /> Enregistrer les réglages
        </Button>
      </div>
    </div>
  )
}
