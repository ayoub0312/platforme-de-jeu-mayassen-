'use client'

import { useEffect } from 'react'
import { trpc } from '@/utils/trpc'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Sliders, Trophy, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const DONUT_COLORS = ['var(--color-brand-500)', 'var(--color-info)', 'var(--color-ink-500)']

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const spring = useSpring(0, { stiffness: 90, damping: 20 })
  const display = useTransform(spring, (v) => `${Math.round(v).toLocaleString('fr-FR')}${suffix}`)

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  if (prefersReducedMotion) {
    return <span>{value.toLocaleString('fr-FR')}{suffix}</span>
  }
  return <motion.span>{display}</motion.span>
}

function TrendBadge({ percent }: { percent: number }) {
  const isPositive = percent >= 0
  return (
    <span
      title="Évolution par rapport aux 7 jours précédents"
      className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums whitespace-nowrap ${
        isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}
      {percent}%<span className="text-ink-500 font-normal">&nbsp;· 7 j</span>
    </span>
  )
}

interface KpiCellProps {
  label: string
  value: number
  suffix?: string
  trend?: number
  emphasis?: boolean
}

function KpiCell({ label, value, suffix, trend, emphasis }: KpiCellProps) {
  return (
    <div className="bg-surface px-5 py-4 min-w-0">
      <p className="text-[13px] text-ink-500 truncate">{label}</p>
      <p className={`mt-1.5 font-semibold tabular-nums tracking-tight ${emphasis ? 'text-brand-700' : 'text-ink-900'} text-[28px] leading-none`}>
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
      <div className="mt-2 h-4">{trend !== undefined && <TrendBadge percent={trend} />}</div>
    </div>
  )
}

const KPI_GRID = 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-rule'

const TOOLTIP_STYLE = { borderRadius: 10, fontSize: 12, border: '1px solid var(--rule)', boxShadow: 'var(--shadow-premium-md)' }

export function Dashboard() {
  const { data, isLoading } = trpc.getDashboardStats.useQuery()

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Card className={`p-0 overflow-hidden ${KPI_GRID}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface px-5 py-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-14 mt-3" />
              <Skeleton className="h-3 w-28 mt-3" />
            </div>
          ))}
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 h-80"><Skeleton className="h-full w-full" /></Card>
          <Card className="p-5 h-80"><Skeleton className="h-full w-full" /></Card>
        </div>
      </div>
    )
  }

  const { kpis, trends, leadsTrend, spinsPerCampaign, prizeBreakdown, pendingWinners, endingSoonCampaigns } = data
  const hasNothingToHandle = pendingWinners.length === 0 && endingSoonCampaigns.length === 0

  return (
    <div className="space-y-6">
      <Card className={`p-0 overflow-hidden ${KPI_GRID}`}>
        <KpiCell label="Leads capturés" value={kpis.totalLeads} trend={trends.totalLeads} />
        <KpiCell label="Campagnes actives" value={kpis.activeCampaigns} />
        <KpiCell label="Tours joués aujourd'hui" value={kpis.spinsToday} trend={trends.spinsToday} />
        <KpiCell label="Lots restants" value={kpis.lotsRestants} />
        <KpiCell label="Taux de conversion" value={kpis.conversionRate} suffix="%" trend={trends.conversionRate} />
        <KpiCell label="Gagnants à contacter" value={kpis.gagnantsAContacter} emphasis={kpis.gagnantsAContacter > 0} />
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Leads — 30 derniers jours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsTrend} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--color-ink-500)' }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-500)' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip
                  labelFormatter={(d) => new Date(String(d)).toLocaleDateString('fr-FR')}
                  formatter={(v) => [String(v), 'Leads']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Line type="monotone" dataKey="count" stroke="var(--color-brand-500)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Tours joués par campagne</h3>
          <div className="h-64">
            {spinsPerCampaign.length === 0 ? (
              <EmptyState icon={Sliders} title="Aucun tour joué" description="Les statistiques apparaîtront dès les premières participations." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spinsPerCampaign} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 10, fill: 'var(--color-ink-500)' }}
                    tickFormatter={(t: string) => (t.length > 10 ? `${t.slice(0, 10)}…` : t)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-500)' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Lots gagnés</h3>
          <div className="h-56 flex items-center">
            {prizeBreakdown.every((p) => p.value === 0) ? (
              <EmptyState icon={Trophy} title="Aucun gain" description="Répartition disponible dès les premiers gains." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={prizeBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {prizeBreakdown.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {prizeBreakdown.map((p, i) => (
              <span key={p.name} className="inline-flex items-center gap-1.5 text-xs text-ink-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {p.name} ({p.value})
              </span>
            ))}
          </div>
        </Card>

        {/* À traiter */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> À traiter
          </h3>
          {hasNothingToHandle ? (
            <EmptyState icon={Trophy} title="Rien à traiter" description="Aucun gagnant en attente ni campagne se terminant bientôt." />
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {pendingWinners.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 py-2 border-b border-rule last:border-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink-900 truncate">{w.userName || w.userEmail} — {w.prizeName}</p>
                    <p className="text-[11px] text-ink-500 truncate">{w.campaignTitle}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--warning)]/10 text-[var(--warning)]">
                    {w.status === 'PENDING' ? 'En attente' : 'Contacté'}
                  </span>
                </div>
              ))}
              {endingSoonCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-rule last:border-0">
                  <div className="min-w-0 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[var(--danger)] shrink-0" />
                    <p className="text-[13px] font-medium text-ink-900 truncate">{c.title}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--danger)]/10 text-[var(--danger)]">
                    Fin le {new Date(c.endDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
