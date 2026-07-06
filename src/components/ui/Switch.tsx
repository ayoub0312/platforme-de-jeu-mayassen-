'use client'

import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  id?: string
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  const generatedId = useId()
  const switchId = id ?? generatedId
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 ${
          checked ? 'bg-gradient-brand-signature' : 'bg-black/15'
        }`}
      >
        <motion.span
          layout
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
          className="h-5 w-5 rounded-full bg-white shadow-sm"
          style={{ marginLeft: checked ? 'calc(100% - 1.25rem)' : '0.125rem' }}
        />
      </button>
      {label && (
        <label htmlFor={switchId} className="text-sm font-semibold text-ink-700 cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  )
}
