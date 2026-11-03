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
      <div className="h-11 w-11 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center mb-6">
        <TriangleAlert className="h-5 w-5" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Une erreur est survenue</h1>
      <p className="text-ink-500 text-sm mt-2 max-w-sm">
        Quelque chose s'est mal passé de notre côté. Réessayez, ou revenez à l'accueil si le problème persiste.
      </p>
      <div className="flex items-center gap-3 mt-7">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-2 h-10 px-4 btn-game text-sm"
        >
          <RotateCcw className="h-4 w-4" /> Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-ink-900 text-sm font-medium bg-surface border border-rule-strong hover:bg-paper-2 transition-colors"
        >
          <Home className="h-4 w-4" /> Accueil
        </Link>
      </div>
    </div>
  )
}
