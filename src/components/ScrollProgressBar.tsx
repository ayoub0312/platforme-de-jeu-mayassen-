'use client'

import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'

// Fine orange bar at the very top of the viewport, fills with scroll progress.
// This reflects actual scroll position (functional, not decorative), so it stays
// active even under prefers-reduced-motion — only the spring smoothing is skipped.
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const prefersReducedMotion = useReducedMotion()
  const smoothed = useSpring(scrollYProgress, { stiffness: 300, damping: 40, restDelta: 0.001 })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-brand origin-left z-[60] pointer-events-none"
      style={{ scaleX: prefersReducedMotion ? scrollYProgress : smoothed }}
    />
  )
}
