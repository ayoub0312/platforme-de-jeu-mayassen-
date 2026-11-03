import Link from 'next/link'

// Gabarit commun des pages d'authentification (design.md § Auth) : en-tête
// minimal, formulaire seul centré sur 400 px, pas d'icône décorative.
export const authLabelCls = 'block text-[13px] font-medium text-ink-700 mb-1.5'
export const authFieldCls =
  'w-full h-10 bg-surface border border-field hover:border-ink-700 rounded-[10px] px-3.5 text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors disabled:opacity-50'
export const authPrimaryBtnCls =
  'w-full h-10 flex items-center justify-center gap-2 bg-ink-900 hover:bg-slate-800 text-paper rounded-full text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
export const authLinkCls =
  'text-ink-900 font-medium underline underline-offset-4 decoration-rule-strong hover:decoration-brand-500'

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
    <div className="min-h-screen flex flex-col bg-paper text-ink-900">
      <header className="h-16 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="h-7 w-7 rounded-lg bg-brand-600 text-white text-sm flex items-center justify-center" aria-hidden="true">O</span>
          Obooking Gift
        </Link>
        <Link href={backHref} className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors whitespace-nowrap">
          {backLabel}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="text-[13px] text-ink-500 mt-8 pt-6 border-t border-rule">{footer}</div>}
        </div>
      </main>
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
