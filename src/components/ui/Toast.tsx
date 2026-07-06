'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  variant: ToastVariant
  message: string
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-white border-l-4 border-l-[var(--success)] text-ink-900' },
  error: { icon: AlertCircle, className: 'bg-white border-l-4 border-l-[var(--danger)] text-ink-900' },
  info: { icon: Info, className: 'bg-white border-l-4 border-l-[var(--info)] text-ink-900' },
}

const AUTO_DISMISS_MS = 4500

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const prefersReducedMotion = useReducedMotion()

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, variant }])
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    timers.current.set(id, timer)
  }, [dismiss])

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info'),
  }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, className } = VARIANT_STYLES[t.variant]
            return (
              <motion.div
                key={t.id}
                role="status"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 40, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${className}`}
                style={{ boxShadow: 'var(--shadow-premium-lg)' }}
              >
                <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="flex-1 leading-snug">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Fermer la notification"
                  className="shrink-0 text-ink-500 hover:text-ink-900 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
