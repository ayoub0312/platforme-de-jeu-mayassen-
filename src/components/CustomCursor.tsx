'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

const CURSOR_SIZE = 18
const INTERACTIVE_SELECTOR = 'a, button, [role="button"], summary, label'
const TEXT_FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

// Progressively "lazier" springs behind the main dot — each one catches up to
// the mouse a little slower than the last, which is what reads as a trail.
// The main dot itself stays on a raw MotionValue (no spring), so it never lags.
const TRAIL_CONFIG = [
  { stiffness: 260, damping: 22, mass: 0.5, size: 12, opacity: 0.32 },
  { stiffness: 150, damping: 20, mass: 0.6, size: 9, opacity: 0.2 },
  { stiffness: 90, damping: 18, mass: 0.7, size: 6, opacity: 0.12 },
]

// Desktop-only accent cursor. Position tracks the mouse 1:1 via a raw MotionValue
// (no spring on x/y) so there's no perceptible lag — only the hover "grow" state
// is spring-animated, which is a discrete size change, not positional tracking.
// Never rendered on touch devices (gated on `(hover: hover) and (pointer: fine)`,
// the primary-input-capability media query — not screen width), and hides itself
// (falling back to the native cursor) over any text field so typing/clicking
// targets are always visually unambiguous.
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [isOverInteractive, setIsOverInteractive] = useState(false)
  const [isOverTextField, setIsOverTextField] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)

  const trail0X = useSpring(x, TRAIL_CONFIG[0])
  const trail0Y = useSpring(y, TRAIL_CONFIG[0])
  const trail1X = useSpring(x, TRAIL_CONFIG[1])
  const trail1Y = useSpring(y, TRAIL_CONFIG[1])
  const trail2X = useSpring(x, TRAIL_CONFIG[2])
  const trail2Y = useSpring(y, TRAIL_CONFIG[2])
  const trail = [
    { x: trail0X, y: trail0Y, ...TRAIL_CONFIG[0] },
    { x: trail1X, y: trail1Y, ...TRAIL_CONFIG[1] },
    { x: trail2X, y: trail2Y, ...TRAIL_CONFIG[2] },
  ]

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setEnabled(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setEnabled(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('custom-cursor-active')

    const onMouseMove = (e: MouseEvent) => {
      x.set(e.clientX - CURSOR_SIZE / 2)
      y.set(e.clientY - CURSOR_SIZE / 2)
      setIsVisible(true)
      const target = e.target as Element | null
      setIsOverTextField(!!target?.closest?.(TEXT_FIELD_SELECTOR))
      setIsOverInteractive(!!target?.closest?.(INTERACTIVE_SELECTOR))
    }
    // Hybrid touch+mouse laptops: a real touch input hides the dot immediately;
    // it reappears on the next genuine mousemove.
    const onTouchStart = () => setIsVisible(false)
    const onMouseLeaveWindow = () => setIsVisible(false)

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('mouseleave', onMouseLeaveWindow)

    return () => {
      document.documentElement.classList.remove('custom-cursor-active')
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('mouseleave', onMouseLeaveWindow)
    }
  }, [enabled, x, y])

  if (!enabled) return null

  const hidden = !isVisible || isOverTextField

  return (
    <>
      {!prefersReducedMotion && trail.map((t, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[99] rounded-full blur-[1px]"
          style={{
            x: t.x,
            y: t.y,
            width: t.size,
            height: t.size,
            marginLeft: (CURSOR_SIZE - t.size) / 2,
            marginTop: (CURSOR_SIZE - t.size) / 2,
            backgroundColor: '#FF6B47',
          }}
          animate={{ opacity: hidden || isOverInteractive ? 0 : t.opacity }}
          transition={{ duration: 0.2 }}
        />
      ))}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] rounded-full"
        style={{
          x,
          y,
          width: CURSOR_SIZE,
          height: CURSOR_SIZE,
          backgroundColor: isOverInteractive ? 'transparent' : '#FF6B47',
          border: isOverInteractive ? '1.5px solid #FF6B47' : 'none',
        }}
        animate={{
          scale: hidden ? 0 : isOverInteractive ? 2.3 : 1,
          opacity: hidden ? 0 : isOverInteractive ? 0.9 : 0.5,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.5 }}
      />
    </>
  )
}
