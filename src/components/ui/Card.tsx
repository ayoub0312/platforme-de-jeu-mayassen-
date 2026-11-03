import type { HTMLAttributes } from 'react'

type CardVariant = 'default' | 'glass'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  hoverLift?: boolean
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 'bg-surface border border-black/[0.06]',
  glass: 'bg-white/70 backdrop-blur-xl border border-white/40',
}

export function Card({ variant = 'default', hoverLift = false, className = '', style, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-ds-lg)] transition-all duration-300 ${VARIANT_CLASSES[variant]} ${
        hoverLift ? 'hover:-translate-y-1' : ''
      } ${className}`}
      style={{ boxShadow: 'var(--shadow-premium-md)', ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
