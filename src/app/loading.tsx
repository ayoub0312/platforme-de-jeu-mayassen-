import { Plane } from 'lucide-react'

// Next.js loading UI convention — shown automatically as the Suspense fallback
// while a route segment's data is being fetched (e.g. force-dynamic pages).
export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5"
      style={{ backgroundColor: 'var(--color-brand-warm-white)' }}
    >
      <div className="relative h-24 w-24 flex items-center justify-center">
        <div className="absolute bottom-2 h-px w-16 bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
        <div className="animate-plane-takeoff text-[#FF8C00]">
          <Plane className="h-10 w-10 -rotate-45" strokeWidth={2} />
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Chargement...</p>
    </div>
  )
}
