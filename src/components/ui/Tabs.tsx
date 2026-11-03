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
    <div role="tablist" className={`inline-flex items-center gap-0.5 p-1 rounded-full bg-paper-2 border border-rule ${className}`}>
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
            className={`relative isolate flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
              selected ? 'text-brand-700 font-semibold' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`${groupId}-tab-indicator`}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 -z-10 rounded-full bg-surface shadow-[0_0_0_1px_var(--rule),var(--shadow-premium-sm)]"
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
