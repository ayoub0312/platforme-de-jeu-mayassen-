import Link from 'next/link'
import { Disc3, Ticket, Plane } from 'lucide-react'

export interface BoardingPassProps {
  title: string
  partnerName: string
  mode: 'ROULETTE' | 'DRAW'
  startDate: string
  endDate: string
  prizes: string[]
  imageData?: string | null
  imageMimeType?: string | null
  href: string | null
  now: number
}

const shortDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

function remaining(endDate: string, now: number) {
  const hours = (new Date(endDate).getTime() - now) / 3_600_000
  if (hours <= 0) return { value: '0', unit: 'terminé', urgent: false }
  if (hours < 48) return { value: String(Math.max(1, Math.ceil(hours))), unit: 'heures', urgent: true }
  const days = Math.ceil(hours / 24)
  return { value: String(days), unit: days > 1 ? 'jours' : 'jour', urgent: days <= 7 }
}

// Carte de campagne présentée comme une carte d'embarquement : partie
// principale (partenaire, jeu, dates, lots) + talon détachable (temps restant
// et action). Les encoches sont découpées dans la couleur du fond de page.
export function BoardingPass({ title, partnerName, mode, startDate, endDate, prizes, imageData, imageMimeType, href, now }: BoardingPassProps) {
  const isDraw = mode === 'DRAW'
  const ModeIcon = isDraw ? Ticket : Disc3
  const left = remaining(endDate, now)
  const shown = prizes.slice(0, 2)
  const extra = prizes.length - shown.length

  return (
    <article className="group relative h-full flex flex-col sm:flex-row rounded-[24px] bg-surface shadow-[0_0_0_1px_var(--rule),var(--shadow-premium-md)] transition-transform duration-200 hover:-translate-y-1">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className={`relative h-24 rounded-t-[24px] sm:rounded-tr-none overflow-hidden ${isDraw ? 'bg-lagon-300' : 'bg-brand-100'}`}>
          {imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:${imageMimeType || 'image/jpeg'};base64,${imageData}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 96" preserveAspectRatio="none" aria-hidden="true">
              <path d="M -10 80 C 120 10, 260 10, 410 60" fill="none" stroke={isDraw ? 'var(--lagon-600)' : 'var(--brand-400)'} strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
            </svg>
          )}
          <span className="absolute top-3 left-4 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-ink-900 text-xs font-semibold text-white">
            <ModeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {isDraw ? 'Tirage au sort' : 'Roulette'}
          </span>
          {!imageData && <Plane className={`absolute right-5 top-1/2 -translate-y-1/2 h-9 w-9 ${isDraw ? 'text-lagon-700' : 'text-brand-600'}`} strokeWidth={1.75} aria-hidden="true" />}
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <p className="text-[13px] font-semibold text-brand-700 truncate">{partnerName}</p>
          <h3 className="mt-1 text-xl leading-tight line-clamp-2">{title}</h3>

          <dl className="mt-4 grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <dt className="text-xs text-ink-500">Départ</dt>
              <dd className="font-display text-base font-semibold tabular-nums">{shortDate(startDate)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-ink-500">Fin</dt>
              <dd className="font-display text-base font-semibold tabular-nums">{shortDate(endDate)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-ink-500">Lots</dt>
              <dd className="font-display text-base font-semibold tabular-nums">{prizes.length}</dd>
            </div>
          </dl>

          {shown.length > 0 && (
            <p className="mt-4 text-sm text-ink-700 line-clamp-2">
              À gagner : <span className="font-semibold text-ink-900">{shown.join(', ')}</span>
              {extra > 0 && <span className="text-ink-500"> et {extra} autre{extra > 1 ? 's' : ''}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Perforation + encoches (horizontale sur mobile, verticale au-delà) */}
      <div className="relative shrink-0 h-0 sm:h-auto sm:w-0 border-t-2 sm:border-t-0 sm:border-l-2 border-dashed border-rule-strong mx-5 sm:mx-0 sm:my-5" aria-hidden="true">
        <span className="absolute -left-8 -top-[9px] sm:left-[-10px] sm:-top-8 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-paper shadow-[inset_0_0_0_1px_var(--rule)]" />
        <span className="absolute -right-8 -top-[9px] sm:left-[-10px] sm:right-auto sm:top-auto sm:-bottom-8 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-paper shadow-[inset_0_0_0_1px_var(--rule)]" />
      </div>

      <div className="shrink-0 sm:w-40 p-5 flex sm:flex-col items-center sm:items-stretch justify-between gap-4 sm:justify-center">
        <div className="sm:text-center">
          <p className="text-xs text-ink-500">Fin dans</p>
          <p className={`font-display text-4xl font-semibold leading-none tabular-nums ${left.urgent ? 'text-brand-700' : 'text-ink-900'}`}>{left.value}</p>
          <p className="text-sm font-semibold text-ink-700">{left.unit}</p>
        </div>
        {href ? (
          <Link href={href} className="btn-game h-11 px-5 text-sm" aria-label={`Embarquer : ${title}`}>
            Embarquer
          </Link>
        ) : (
          <span className="text-[13px] text-ink-500 text-center">Bientôt</span>
        )}
      </div>
    </article>
  )
}
