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

const STEP_TONES = ['bg-brand-600 text-white', 'bg-ambre-400 text-ink-900', 'bg-lagon-400 text-ink-900']

export function HowItWorksTimeline() {
  return (
    <ol className="divide-y-2 divide-dashed divide-rule-strong">
      {steps.map((step, i) => (
        <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 py-6 items-start">
          <span className={`h-10 w-10 rounded-full flex items-center justify-center font-display text-lg font-semibold ${STEP_TONES[i % STEP_TONES.length]}`} aria-hidden="true">
            {i + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-xl text-ink-900">{step.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
