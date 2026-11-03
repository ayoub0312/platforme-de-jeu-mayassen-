'use client'

import { forwardRef } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-white bg-gradient-brand-signature hover:brightness-110 disabled:brightness-100',
  secondary: 'bg-surface-alt text-ink-900 border border-black/[0.08] hover:bg-brand-50',
  ghost: 'bg-transparent text-ink-700 hover:bg-black/[0.04]',
  danger: 'bg-[var(--danger)] text-white hover:brightness-110',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-[var(--radius-ds-sm)]',
  md: 'h-11 px-5 text-sm gap-2 rounded-[var(--radius-ds-md)]',
  lg: 'h-13 px-6 text-base gap-2 rounded-[var(--radius-ds-md)]',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  children?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, className = '', children, ...props },
  ref
) {
  const prefersReducedMotion = useReducedMotion()
  const isDisabled = disabled || loading

  return (
    <motion.button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={!isDisabled && !prefersReducedMotion ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled && !prefersReducedMotion ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center font-bold tracking-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  )
})
