import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helpText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helpText, id, className = '', rows = 4, ...props },
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
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={!!error || undefined}
        aria-describedby={describedById}
        className={`px-3.5 py-2.5 rounded-[var(--radius-ds-sm)] bg-surface border text-sm text-ink-900 placeholder:text-ink-500/60 transition-colors resize-y focus:outline-none focus:ring-2 focus:ring-offset-0 ${
          error
            ? 'border-[var(--danger)] focus:ring-[var(--danger)]/30'
            : 'border-black/[0.1] focus:border-brand-500 focus:ring-brand-500/25'
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
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
