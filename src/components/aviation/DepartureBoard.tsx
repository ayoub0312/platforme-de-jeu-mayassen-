import Link from 'next/link'

export interface DepartureRow {
  id: string
  title: string
  partnerName: string
  mode: 'ROULETTE' | 'DRAW'
  endDate: string
  href: string | null
}

// Chiffres en tuiles « volet » façon panneau d'aéroport.
function FlapDigits({ value, delay = 0 }: { value: string; delay?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {value.split('').map((ch, i) => (
        <span
          key={i}
          className="flap relative inline-flex h-8 w-6 items-center justify-center rounded-[5px] bg-[oklch(19%_0.045_265)] font-display text-lg font-semibold text-ambre-300 tabular-nums"
          style={{ animationDelay: `${delay + i * 70}ms` }}
        >
          {ch}
          <span className="absolute inset-x-0 top-1/2 h-px bg-black/40" />
        </span>
      ))}
    </span>
  )
}

function daysLeft(endDate: string, now: number) {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - now) / 86_400_000))
}

// Tableau des départs : les jeux qui se terminent bientôt, présentés comme
// des vols. Données réelles uniquement.
export function DepartureBoard({ rows, now }: { rows: DepartureRow[]; now: number }) {
  if (rows.length === 0) return null
  return (
    <div className="rounded-[22px] bg-ink-900/95 text-white shadow-[0_0_0_1px_oklch(100%_0_0/0.08),var(--shadow-premium-lg)] overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-white/10">
        <h2 className="text-xl text-white">Prochains départs</h2>
        <span className="hidden sm:inline text-sm text-white/60">Jeux qui se terminent bientôt</span>
      </div>

      <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_8rem_9.5rem] gap-4 px-6 pt-3 pb-2 text-xs font-semibold text-white/50">
        <span>Jeu</span>
        <span>Partenaire</span>
        <span>Type</span>
        <span>Fin dans</span>
        <span className="text-right">Statut</span>
      </div>

      <ul className="divide-y divide-white/10">
        {rows.map((row, r) => {
          const days = daysLeft(row.endDate, now)
          const lastCall = days <= 7
          const status = (
            <span
              className={`inline-flex h-8 items-center gap-2 px-3 rounded-full text-[13px] font-bold whitespace-nowrap ${
                lastCall ? 'bg-brand-500 text-ink-900' : 'bg-ambre-400 text-ink-900'
              }`}
            >
              <span className={`h-2 w-2 rounded-full bg-ink-900 ${lastCall ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden="true" />
              {lastCall ? 'Dernier appel' : 'Embarquement'}
            </span>
          )
          const content = (
            <>
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold leading-tight truncate">{row.title}</span>
                <span className="md:hidden block text-sm text-white/60 truncate">{row.partnerName}</span>
              </span>
              <span className="hidden md:block text-[15px] text-white/80 truncate self-center">{row.partnerName}</span>
              <span className="hidden md:inline-flex self-center w-fit h-7 items-center px-2.5 rounded-full bg-white/10 text-[13px] font-semibold">
                {row.mode === 'DRAW' ? 'Tirage' : 'Roulette'}
              </span>
              <span className="self-center flex items-center gap-2">
                <FlapDigits value={String(days).padStart(2, '0')} delay={r * 120} />
                <span className="text-[13px] text-white/60">{days > 1 ? 'jours' : 'jour'}</span>
                <span className="sr-only">{days} jours restants</span>
              </span>
              <span className="self-center md:justify-self-end">{status}</span>
            </>
          )
          const rowCls =
            'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_8rem_9.5rem] gap-x-4 gap-y-2 px-5 sm:px-6 py-3.5'
          return (
            <li key={row.id}>
              {row.href ? (
                <Link href={row.href} className={`${rowCls} transition-colors hover:bg-white/[0.06]`}>
                  {content}
                </Link>
              ) : (
                <div className={rowCls}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
