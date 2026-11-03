import Link from 'next/link'
import { SkyScene } from './aviation/SkyScene'

// Gabarit commun des pages d'authentification (design.md § Auth) : en-tête
// minimal, formulaire seul centré sur 400 px, pas d'icône décorative.
export const authLabelCls = 'block text-sm font-semibold text-ink-900 mb-1.5'
export const authFieldCls =
  'w-full h-12 bg-surface border-2 border-field hover:border-ink-700 rounded-2xl px-4 text-[15px] text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors disabled:opacity-50'
export const authPrimaryBtnCls =
  'w-full h-13 btn-game text-base'
export const authLinkCls =
  'text-brand-700 font-bold underline underline-offset-4 decoration-2 decoration-brand-100 hover:decoration-brand-500'

interface AuthShellProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  footer?: React.ReactNode
  children: React.ReactNode
}

export function AuthShell({ title, subtitle, backHref = '/', backLabel = 'Retour au site', footer, children }: AuthShellProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] bg-paper text-ink-900">
      {/* Panneau de marque — décoratif, masqué sur mobile */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14 text-white" aria-hidden="true">
        <SkyScene routeClassName="absolute left-[4%] top-[22%] w-[92%]" />
        <Link href="/" tabIndex={-1} className="relative flex items-center gap-2.5 font-display text-xl font-semibold text-white">
          <span className="h-9 w-9 rounded-xl bg-brand-500 text-ink-900 text-base flex items-center justify-center">O</span>
          Obooking Gift
        </Link>
        <p className="relative font-display text-4xl xl:text-5xl font-semibold leading-[1.02] max-w-md">
          Votre prochain voyage commence par un jeu
        </p>
      </aside>

      <div className="flex flex-col min-w-0">
        <header className="h-16 px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold lg:invisible">
            <span className="h-8 w-8 rounded-xl bg-brand-500 text-ink-900 text-sm flex items-center justify-center" aria-hidden="true">O</span>
            Obooking Gift
          </Link>
          <Link href={backHref} className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors whitespace-nowrap">
            {backLabel}
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-[420px]">
            <h1 className="text-3xl sm:text-4xl leading-tight">{title}</h1>
            {subtitle && <p className="text-[15px] text-ink-700 mt-2 leading-relaxed">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="text-sm text-ink-700 mt-8 pt-6 border-t-2 border-dashed border-rule-strong">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  )
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-[13px] text-[var(--danger)] bg-[var(--danger)]/[0.06] border border-[var(--danger)]/20 rounded-[10px] px-3 py-2.5">
      {children}
    </p>
  )
}

export function AuthSuccess({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="text-sm text-ink-900 bg-[var(--success)]/[0.07] border border-[var(--success)]/25 rounded-[10px] px-4 py-3.5">
      {children}
    </div>
  )
}
