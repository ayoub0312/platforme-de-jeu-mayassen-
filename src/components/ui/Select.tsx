import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helpText?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helpText, id, className = '', children, ...props },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedById = error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={describedById}
          className={`h-11 w-full appearance-none pl-3.5 pr-9 rounded-[var(--radius-ds-sm)] bg-surface border text-sm text-ink-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-[var(--danger)] focus:ring-[var(--danger)]/30'
              : 'border-black/[0.1] focus:border-brand-500 focus:ring-brand-500/25'
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" aria-hidden="true" />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : helpText ? (
        <p id={`${inputId}-help`} className="text-xs text-ink-500">
          {helpText}
        </p>
      ) : null}
    </div>
  )
})
