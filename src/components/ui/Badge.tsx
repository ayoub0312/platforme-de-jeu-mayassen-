import type { HTMLAttributes } from 'react'

export type BadgeStatus =
  | 'actif'
  | 'pause'
  | 'termine'
  | 'epuise'
  | 'gagne'
  | 'en_attente'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus
}

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  actif: 'bg-[var(--success)]/10 text-[var(--success)]',
  pause: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  termine: 'bg-black/[0.06] text-ink-500',
  epuise: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  gagne: 'bg-brand-50 text-brand-600',
  en_attente: 'bg-[var(--info)]/10 text-[var(--info)]',
  success: 'bg-[var(--success)]/10 text-[var(--success)]',
  danger: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  info: 'bg-[var(--info)]/10 text-[var(--info)]',
  neutral: 'bg-black/[0.06] text-ink-500',
}

const STATUS_LABELS: Record<BadgeStatus, string> = {
  actif: 'Actif',
  pause: 'En pause',
  termine: 'Terminé',
  epuise: 'Épuisé',
  gagne: 'Gagné',
  en_attente: 'En attente',
  success: 'Succès',
  danger: 'Erreur',
  warning: 'Attention',
  info: 'Info',
  neutral: '—',
}

export function Badge({ status = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_CLASSES[status]} ${className}`}
      {...props}
    >
      {children ?? STATUS_LABELS[status]}
    </span>
  )
}
