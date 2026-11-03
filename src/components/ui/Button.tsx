'use client'

import { forwardRef } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// Voix des boutons (design.md) : pilule, primaire encre dans l'app, `brand`
// (corail) réservé aux actions joueur.
type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-ink-900 text-paper hover:bg-slate-800',
  brand: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-surface text-ink-900 border border-rule-strong hover:bg-paper-2',
  ghost: 'bg-transparent text-ink-700 hover:text-ink-900 hover:bg-black/[0.04]',
  danger: 'bg-[var(--danger)] text-white hover:brightness-95',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
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
      whileTap={!isDisabled && !prefersReducedMotion ? { y: 1 } : undefined}
      transition={{ duration: 0.1 }}
      className={`inline-flex items-center justify-center rounded-full font-medium transition-colors duration-150 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  )
})
