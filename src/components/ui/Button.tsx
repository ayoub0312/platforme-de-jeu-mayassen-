'use client'

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// Voix des boutons (design.md) : pilule « à presser » (relief qui s'écrase au
// clic). `primary` et `brand` = corail, `secondary` = clair à bordure.
type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'btn-game',
  brand: 'btn-game',
  secondary: 'btn-game-light',
  ghost: 'rounded-full bg-transparent text-ink-700 hover:text-ink-900 hover:bg-black/[0.05] font-semibold',
  danger: 'rounded-full bg-[var(--danger)] text-white hover:brightness-95 font-semibold',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2',
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
  const isDisabled = disabled || loading

  return (
    <motion.button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  )
})
