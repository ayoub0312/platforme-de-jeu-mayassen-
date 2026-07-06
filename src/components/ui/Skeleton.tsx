import type { HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const ROUNDED_CLASSES: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-[var(--radius-ds-sm)]',
  md: 'rounded-[var(--radius-ds-md)]',
  lg: 'rounded-[var(--radius-ds-lg)]',
  full: 'rounded-full',
}

export function Skeleton({ rounded = 'md', className = '', ...props }: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`skeleton-shimmer ${ROUNDED_CLASSES[rounded]} ${className}`}
      {...props}
    />
  )
}
