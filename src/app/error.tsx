'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TriangleAlert, RotateCcw, Home } from 'lucide-react'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[Route Error]', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-24">
      <div className="h-16 w-16 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center mb-6">
        <TriangleAlert className="h-7 w-7" />
      </div>
      <h1 className="font-display text-xl font-semibold text-ink-900">Une erreur est survenue</h1>
      <p className="text-ink-500 text-sm mt-2 max-w-sm">
        Quelque chose s'est mal passé de notre côté. Réessayez, ou revenez à l'accueil si le problème persiste.
      </p>
      <div className="flex items-center gap-3 mt-7">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold bg-gradient-brand-signature hover:brightness-110 transition-all cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" /> Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-ink-700 text-sm font-bold bg-surface-alt border border-black/[0.08] hover:bg-black/[0.04] transition-all"
        >
          <Home className="h-4 w-4" /> Accueil
        </Link>
      </div>
    </div>
  )
}
