'use client'

import { Trophy, Mail, PhoneCall, Send, CheckCheck } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeStatus } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { DataTable } from './DataTable'

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'CONTACTED', label: 'Contacté' },
  { value: 'DELIVERED', label: 'Remis' },
  { value: 'RETRIEVED', label: 'Récupéré' },
]

const STATUS_BADGE: Record<string, BadgeStatus> = {
  PENDING: 'en_attente',
  CONTACTED: 'info',
  DELIVERED: 'gagne',
  RETRIEVED: 'success',
}

export function WinnersTab() {
  const toast = useToast()
  const { data: winners, isLoading, refetch } = trpc.getAllWinners.useQuery()
  const updateStatusMut = trpc.updateWinnerStatus.useMutation()
  const resendEmailMut = trpc.resendWinnerEmail.useMutation()

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatusMut.mutateAsync({ id, status: status as any })
      toast.success('Statut mis à jour.')
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour du statut.')
    }
  }

  const handleResend = async (id: string) => {
    try {
      await resendEmailMut.mutateAsync({ id })
      toast.success('Email renvoyé avec succès.')
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de l'email.")
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-black/[0.06]">
        <h3 className="text-xl font-bold text-ink-900">Gagnants</h3>
        <p className="text-ink-500 text-xs mt-1">Suivez la remise des lots : en attente → contacté → remis.</p>
      </div>

      <div className="p-6">
        <DataTable
          columns={[
            {
              key: 'winner', header: 'Gagnant', sortValue: (w: any) => w.userName || w.userEmail,
              render: (w: any) => (
                <>
                  <div className="font-extrabold text-ink-900">{w.userName || 'Anonyme'}</div>
                  <div className="text-xs text-ink-500 mt-1 flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {w.userEmail}</span>
                    {w.userPhone && <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {w.userPhone}</span>}
                  </div>
                </>
              ),
            },
            {
              key: 'prize', header: 'Lot', sortValue: (w: any) => w.prizeName,
              render: (w: any) => (
                <>
                  <div className="font-bold text-ink-900">{w.prizeName}</div>
                  <div className="text-[10px] text-ink-500 uppercase font-bold mt-0.5">{w.prizeType === 'PHYSICAL' ? 'Physique' : 'Numérique'}</div>
                </>
              ),
            },
            {
              key: 'campaign', header: 'Campagne', sortValue: (w: any) => w.campaignTitle,
              render: (w: any) => <span className="text-ink-700 font-semibold">{w.campaignTitle}</span>,
            },
            {
              key: 'status', header: 'Statut',
              render: (w: any) => (
                <div className="flex items-center gap-2">
                  <Badge status={STATUS_BADGE[w.status] ?? 'neutral'}>
                    {STATUS_OPTIONS.find((s) => s.value === w.status)?.label ?? w.status}
                  </Badge>
                  <select
                    value={w.status}
                    onChange={(e) => handleStatusChange(w.id, e.target.value)}
                    className="h-8 px-2 rounded-[var(--radius-ds-sm)] bg-surface-alt border border-black/[0.08] text-[11px] font-bold text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500/25 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              ),
            },
            {
              key: 'claimedAt', header: 'Date du gain', align: 'right',
              sortValue: (w: any) => new Date(w.claimedAt).getTime(),
              render: (w: any) => <span className="text-xs text-ink-500">{new Date(w.claimedAt).toLocaleDateString('fr-FR')}</span>,
            },
            {
              key: 'actions', header: 'Actions', align: 'right',
              render: (w: any) => (
                <button
                  onClick={() => handleResend(w.id)}
                  disabled={!w.canResendEmail || resendEmailMut.isPending}
                  title={w.canResendEmail ? "Renvoyer l'email de gain" : "Aucune adresse d'envoi configurée"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-ds-sm)] bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer transition-colors"
                >
                  <Send className="h-3.5 w-3.5" /> Renvoyer
                </button>
              ),
            },
          ]}
          data={winners}
          isLoading={isLoading}
          getRowId={(w: any) => w.id}
          emptyIcon={Trophy}
          emptyTitle="Aucun gagnant pour le moment"
          emptyDescription="Les gains apparaîtront ici dès les premières parties jouées."
          exportColumns={[
            { header: 'Nom', value: (w: any) => w.userName || '' },
            { header: 'Email', value: (w: any) => w.userEmail },
            { header: 'Téléphone', value: (w: any) => w.userPhone || '' },
            { header: 'Lot', value: (w: any) => w.prizeName },
            { header: 'Campagne', value: (w: any) => w.campaignTitle },
            { header: 'Statut', value: (w: any) => w.status },
            { header: 'Date du gain', value: (w: any) => new Date(w.claimedAt).toISOString() },
          ]}
          exportFilename="gagnants"
          bulkActions={[
            {
              label: 'Marquer comme remis',
              icon: CheckCheck,
              onClick: (rows: any[]) => {
                rows.forEach((w) => handleStatusChange(w.id, 'DELIVERED'))
              },
            },
          ]}
        />
      </div>
    </Card>
  )
}
