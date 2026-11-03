interface PoweredByLoomensProps {
  // `light` sur fond sombre (pied de page bleu nuit), `dark` sur fond clair.
  tone?: 'light' | 'dark'
  className?: string
}

// Mention « Powered by Loomens » avec le logo de l'agence, lien vers son site.
export function PoweredByLoomens({ tone = 'light', className = '' }: PoweredByLoomensProps) {
  const colors =
    tone === 'light'
      ? 'text-slate-400 hover:text-white'
      : 'text-slate-500 hover:text-slate-900'

  return (
    <a
      href="https://www.loomens.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by Loomens (ouvre loomens.com dans un nouvel onglet)"
      className={`inline-flex items-center gap-2 text-[11px] font-semibold transition-colors ${colors} ${className}`}
    >
      <span>Powered by</span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="16" height="15" viewBox="80 95 560 530" aria-hidden="true" className="shrink-0">
          <path
            fill="currentColor"
            d="M237,100 L437,100 L234,434 A85.5,85.5 0 0 1 88,346 Z M250,450 L636,450 L538,622 L250,622 A86,86 0 0 1 250,450 Z"
          />
        </svg>
        <span className="font-black tracking-[0.14em]">LOOMENS</span>
      </span>
    </a>
  )
}
