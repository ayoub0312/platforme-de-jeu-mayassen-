'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface DisclosureProps {
  label: string
  children: ReactNode
  defaultOpen?: boolean
}

// Collapsed-by-default section for secondary settings — keeps the primary
// content (segments, dates...) visually dominant instead of competing with
// rarely-touched options for the user's attention.
export function Disclosure({ label, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-black/[0.06] rounded-[var(--radius-ds-md)] bg-surface-alt/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-ink-700 cursor-pointer"
      >
        {label}
        <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  )
}
