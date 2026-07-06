export interface SpinnerProps {
  size?: number
  className?: string
  label?: string
}

export function Spinner({ size = 24, className = '', label = 'Chargement...' }: SpinnerProps) {
  return (
    <span role="status" className={`inline-flex items-center justify-center ${className}`}>
      <span
        aria-hidden="true"
        className="inline-block rounded-full border-[3px] border-brand-50 border-t-brand-500 animate-spin motion-reduce:animate-[spin_1.6s_linear_infinite]"
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
