'use client'

import { useId, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export interface TabItem {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className = '' }: TabsProps) {
  const groupId = useId()
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const prefersReducedMotion = useReducedMotion()

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const nextIndex = e.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length
    const nextTab = tabs[nextIndex]
    onChange(nextTab.value)
    tabRefs.current[nextTab.value]?.focus()
  }

  return (
    <div role="tablist" className={`inline-flex items-center gap-1 p-1 rounded-[var(--radius-ds-md)] bg-surface-alt ${className}`}>
      {tabs.map((tab, index) => {
        const selected = tab.value === value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            ref={(el) => { tabRefs.current[tab.value] = el }}
            role="tab"
            id={`${groupId}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${groupId}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`relative isolate flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-ds-sm)] text-xs font-bold transition-colors cursor-pointer ${
              selected ? 'text-white' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`${groupId}-tab-indicator`}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-0 -z-10 rounded-[var(--radius-ds-sm)] bg-gradient-brand-signature"
              />
            )}
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
