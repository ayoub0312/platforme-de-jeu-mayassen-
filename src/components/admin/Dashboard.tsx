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
import { Users, Sliders, Play, Package, Percent, Trophy, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react'
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
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}
      {percent}% vs sem. dernière
    </span>
  )
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  trend?: number
}

function KpiCard({ icon: Icon, label, value, suffix, trend }: KpiCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</span>
        <div className="h-9 w-9 rounded-[var(--radius-ds-sm)] bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="font-display text-3xl font-semibold text-ink-900 mt-3">
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <div className="mt-2 h-4">{trend !== undefined && <TrendBadge percent={trend} />}</div>
    </Card>
  )
}

function KpiSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16 mt-4" />
      <Skeleton className="h-3 w-28 mt-3" />
    </Card>
  )
}

export function Dashboard() {
  const { data, isLoading } = trpc.getDashboardStats.useQuery()

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
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
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={Users} label="Leads capturés" value={kpis.totalLeads} trend={trends.totalLeads} />
        <KpiCard icon={Sliders} label="Campagnes actives" value={kpis.activeCampaigns} />
        <KpiCard icon={Play} label="Tours joués (auj.)" value={kpis.spinsToday} trend={trends.spinsToday} />
        <KpiCard icon={Package} label="Lots restants" value={kpis.lotsRestants} />
        <KpiCard icon={Percent} label="Taux de conversion" value={kpis.conversionRate} suffix="%" trend={trends.conversionRate} />
        <KpiCard icon={Trophy} label="Gagnants à contacter" value={kpis.gagnantsAContacter} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900 mb-4">Leads — 30 derniers jours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsTrend} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,31,31,0.08)" vertical={false} />
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
                  contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid rgba(0,0,0,0.06)' }}
                />
                <Line type="monotone" dataKey="count" stroke="var(--color-brand-500)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900 mb-4">Tours joués par campagne</h3>
          <div className="h-64">
            {spinsPerCampaign.length === 0 ? (
              <EmptyState icon={Sliders} title="Aucun tour joué" description="Les statistiques apparaîtront dès les premières participations." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spinsPerCampaign} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,31,31,0.08)" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 10, fill: 'var(--color-ink-500)' }}
                    tickFormatter={(t: string) => (t.length > 10 ? `${t.slice(0, 10)}…` : t)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-500)' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid rgba(0,0,0,0.06)' }} />
                  <Bar dataKey="count" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900 mb-4">Lots gagnés</h3>
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
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid rgba(0,0,0,0.06)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {prizeBreakdown.map((p, i) => (
              <span key={p.name} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {p.name} ({p.value})
              </span>
            ))}
          </div>
        </Card>

        {/* À traiter */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> À traiter
          </h3>
          {hasNothingToHandle ? (
            <EmptyState icon={Trophy} title="Rien à traiter" description="Aucun gagnant en attente ni campagne se terminant bientôt." />
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {pendingWinners.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 py-2 border-b border-black/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-900 truncate">{w.userName || w.userEmail} — {w.prizeName}</p>
                    <p className="text-[11px] text-ink-500 truncate">{w.campaignTitle}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
                    {w.status === 'PENDING' ? 'En attente' : 'Contacté'}
                  </span>
                </div>
              ))}
              {endingSoonCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-black/[0.04] last:border-0">
                  <div className="min-w-0 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[var(--danger)] shrink-0" />
                    <p className="text-xs font-bold text-ink-900 truncate">{c.title}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
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
