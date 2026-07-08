'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
          onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })}
          aria-label="Retour en haut de page"
          className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-[#FF6B47] hover:bg-[#e85530] text-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
