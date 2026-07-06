import Link from 'next/link'
import { SearchX, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-24">
      <div className="h-16 w-16 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-6">
        <SearchX className="h-7 w-7" />
      </div>
      <span className="font-display text-6xl font-semibold text-ink-900 tracking-tight">404</span>
      <h1 className="font-display text-xl font-semibold text-ink-900 mt-3">Page introuvable</h1>
      <p className="text-ink-500 text-sm mt-2 max-w-sm">
        Cette page n'existe pas ou plus. Vérifiez le lien ou retournez à l'accueil pour découvrir nos campagnes en cours.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 mt-7 px-5 py-3 rounded-xl text-white text-sm font-bold bg-gradient-brand-signature hover:brightness-110 transition-all"
      >
        <Home className="h-4 w-4" /> Retour à l'accueil
      </Link>
    </div>
  )
}
