const steps = [
  {
    title: 'Choisissez un jeu',
    desc: "Séjours à l'hôtel, circuits, offres Omra ou bons d'achat : chaque jeu affiche ses lots et sa date de fin.",
  },
  {
    title: 'Inscrivez-vous en quelques secondes',
    desc: 'Nom et email suffisent pour recevoir vos lancers ou votre participation au tirage.',
  },
  {
    title: 'Jouez, puis récupérez votre lot',
    desc: "En cas de gain, vous recevez un bon par email avec un QR code à présenter au partenaire.",
  },
]

export function HowItWorksTimeline() {
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {steps.map((step, i) => (
        <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 py-6">
          <span className="text-sm font-medium text-ink-500 tabular-nums pt-0.5" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold tracking-tight text-ink-900">{step.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
