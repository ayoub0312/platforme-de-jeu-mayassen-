import type { HTMLAttributes } from 'react'

// `glass` est conservé pour compatibilité mais rendu comme une carte pleine :
// le verre dépoli est exclu du design system (design.md).
type CardVariant = 'default' | 'glass'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  hoverLift?: boolean
}

export function Card({ variant = 'default', hoverLift = false, className = '', style, children, ...props }: CardProps) {
  void variant
  return (
    <div
      className={`rounded-[var(--radius-ds-md)] bg-surface border border-rule transition-colors duration-150 ${
        hoverLift ? 'hover:border-rule-strong' : ''
      } ${className}`}
      style={{ boxShadow: 'var(--shadow-premium-sm)', ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
