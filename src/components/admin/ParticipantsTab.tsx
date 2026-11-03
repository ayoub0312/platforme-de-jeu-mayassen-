'use client'

import { useMemo, useState } from 'react'
import { Users, Mail, PhoneCall, Trophy, Play } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeStatus } from '@/components/ui/Badge'
import { DataTable } from './DataTable'

const PRIZE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONTACTED: 'Contacté',
  DELIVERED: 'Remis',
  RETRIEVED: 'Récupéré',
}

const PRIZE_STATUS_BADGE: Record<string, BadgeStatus> = {
  PENDING: 'en_attente',
  CONTACTED: 'info',
  DELIVERED: 'gagne',
  RETRIEVED: 'success',
}

const SOURCE_LABEL: Record<string, string> = {
  WIDGET: 'Widget',
  QR_CODE: 'QR code',
  LINK: 'Lien',
}

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export function ParticipantsTab({ partnerId }: { partnerId?: string }) {
  const { data: participants, isLoading } = trpc.getParticipants.useQuery(partnerId ? { partnerId } : undefined)
  const [campaignFilter, setCampaignFilter] = useState('all')

  const campaignOptions = useMemo(() => {
    const byId = new Map<string, string>()
    participants?.forEach((p) => p.campaigns.forEach((c) => byId.set(c.id, c.title)))
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [participants])

  const rows = useMemo(
    () => campaignFilter === 'all'
      ? participants
      : participants?.filter((p) => p.campaigns.some((c) => c.id === campaignFilter)),
    [participants, campaignFilter]
  )

  const totals = useMemo(() => ({
    participants: rows?.length ?? 0,
    spinsUsed: rows?.reduce((acc, p) => acc + p.spinsUsed, 0) ?? 0,
    prizes: rows?.reduce((acc, p) => acc + p.prizes.length, 0) ?? 0,
  }), [rows])

  type Row = NonNullable<typeof participants>[number]

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-black/[0.06] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-ink-900">Participants</h3>
          <p className="text-ink-500 text-xs mt-1">
            Toutes les personnes ayant participé à vos campagnes : coordonnées, lancers joués et lots gagnés.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          {[
            { icon: Users, label: 'Participants', value: totals.participants },
            { icon: Play, label: 'Lancers joués', value: totals.spinsUsed },
            { icon: Trophy, label: 'Lots gagnés', value: totals.prizes },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5 px-3.5 py-2 rounded-[var(--radius-ds-sm)] bg-surface-alt border border-black/[0.06]">
              <Icon className="h-4 w-4 text-brand-500" />
              <div className="leading-tight">
                <div className="text-base font-black text-ink-900">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        <DataTable<Row>
          columns={[
            {
              key: 'participant', header: 'Participant', sortValue: (p) => p.name || p.email,
              render: (p) => (
                <>
                  <div className="font-extrabold text-ink-900">{p.name || 'Anonyme'}</div>
                  <div className="text-xs text-ink-500 mt-1 flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</span>
                    {p.phone && <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {p.phone}</span>}
                  </div>
                </>
              ),
            },
            {
              key: 'campaigns', header: 'Campagnes', sortValue: (p) => p.campaigns.length,
              render: (p) => (
                <div className="flex flex-wrap gap-1.5 max-w-xs">
                  {p.campaigns.map((c) => (
                    <span key={c.id} className="px-2 py-0.5 bg-brand-50 border border-brand-500/20 rounded-md text-[10px] font-bold text-brand-600">
                      {c.title}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: 'spins', header: 'Lancers', sortValue: (p) => p.spinsUsed,
              render: (p) => (
                <div className="text-xs">
                  <span className="font-black text-ink-900">{p.spinsUsed}</span>
                  <span className="text-ink-500"> joué{p.spinsUsed > 1 ? 's' : ''}</span>
                  <div className="text-[10px] text-ink-500 mt-0.5">{p.spinsRemaining} restant{p.spinsRemaining > 1 ? 's' : ''}</div>
                </div>
              ),
            },
            {
              key: 'prizes', header: 'Lots gagnés', sortValue: (p) => p.prizes.length,
              render: (p) => p.prizes.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {p.prizes.map((w) => (
                    <div key={w.id} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-900">{w.prizeName}</span>
                      <Badge status={PRIZE_STATUS_BADGE[w.status] ?? 'neutral'}>
                        {PRIZE_STATUS_LABEL[w.status] ?? w.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-ink-500 italic text-xs">Aucun lot</span>
              ),
            },
            {
              key: 'source', header: 'Source',
              render: (p) => <span className="text-xs text-ink-700 font-semibold">{p.sources.map((s) => SOURCE_LABEL[s] ?? s).join(', ')}</span>,
            },
            {
              key: 'lastParticipationAt', header: 'Dernière participation', align: 'right',
              sortValue: (p) => new Date(p.lastParticipationAt).getTime(),
              render: (p) => <span className="text-xs text-ink-500">{formatDate(p.lastParticipationAt)}</span>,
            },
          ]}
          data={rows}
          isLoading={isLoading}
          getRowId={(p) => p.id}
          searchPlaceholder="Rechercher un nom, un email, un téléphone..."
          searchFn={(p, q) => {
            const query = q.toLowerCase()
            return [p.name, p.email, p.phone].some((v) => v?.toLowerCase().includes(query))
          }}
          toolbarExtra={
            campaignOptions.length > 1 ? (
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                aria-label="Filtrer par campagne"
                className="h-9 px-3 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] text-xs font-bold text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500/25 cursor-pointer"
              >
                <option value="all">Toutes les campagnes</option>
                {campaignOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
              </select>
            ) : undefined
          }
          emptyIcon={Users}
          emptyTitle="Aucun participant pour le moment"
          emptyDescription="Les personnes qui s'inscrivent à vos campagnes apparaîtront ici."
          exportColumns={[
            { header: 'Nom', value: (p) => p.name || '' },
            { header: 'Email', value: (p) => p.email },
            { header: 'Téléphone', value: (p) => p.phone || '' },
            { header: 'Campagnes', value: (p) => p.campaigns.map((c) => c.title).join('; ') },
            { header: 'Lancers joués', value: (p) => p.spinsUsed },
            { header: 'Lancers restants', value: (p) => p.spinsRemaining },
            { header: 'Lots gagnés', value: (p) => p.prizes.map((w) => `${w.prizeName} (${PRIZE_STATUS_LABEL[w.status] ?? w.status})`).join('; ') },
            { header: 'Source', value: (p) => p.sources.join('; ') },
            { header: 'Première participation', value: (p) => new Date(p.firstParticipationAt).toISOString() },
            { header: 'Dernière participation', value: (p) => new Date(p.lastParticipationAt).toISOString() },
          ]}
          exportFilename="participants"
        />
      </div>
    </Card>
  )
}
