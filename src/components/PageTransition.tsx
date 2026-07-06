'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

// Soft fade+rise between routes. Deliberately NOT implemented as `src/app/template.tsx` —
// Next.js remounts template.tsx on every navigation, which defeats AnimatePresence's
// exit animation (it needs a stable parent that keeps the outgoing tree mounted while
// it animates out). This wrapper lives inside the persistent root layout.tsx instead,
// which is the parent that actually stays mounted across navigations.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
