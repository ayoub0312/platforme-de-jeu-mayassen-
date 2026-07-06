'use client'

import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: 'top' | 'bottom'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()
  const prefersReducedMotion = useReducedMotion()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {/* Clone-free wrapper: children receive aria-describedby via a plain span wrapper */}
      <span aria-describedby={visible ? tooltipId : undefined} className="inline-flex">
        {children}
      </span>
      <AnimatePresence>
        {visible && (
          <motion.span
            id={tooltipId}
            role="tooltip"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: side === 'top' ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-ink-900 px-2.5 py-1.5 text-[11px] font-semibold text-white ${
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
