import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, className = '', ...props },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label htmlFor={inputId} className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md border border-black/[0.15] bg-surface transition-colors checked:border-brand-500 checked:[background-image:var(--gradient-brand-signature)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          {...props}
        />
        <Check className="pointer-events-none h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" aria-hidden="true" />
      </span>
      {label && <span className="text-sm font-semibold text-ink-700">{label}</span>}
    </label>
  )
})
