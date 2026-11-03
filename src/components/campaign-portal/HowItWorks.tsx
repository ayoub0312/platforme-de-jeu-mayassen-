const steps = [
  {
    title: 'Inscrivez-vous',
    desc: 'Nom et email suffisent pour recevoir vos lancers offerts et commencer tout de suite.',
  },
  {
    title: 'Lancez la roue',
    desc: 'Le résultat est tiré côté serveur au moment du lancer : chaque tour a les mêmes chances.',
  },
  {
    title: 'Gagnez des lancers bonus',
    desc: 'Partagez votre lien de parrainage ou relevez les défis pour cumuler des lancers.',
  },
]

const STEP_TONES = ['bg-brand-600 text-white', 'bg-ambre-400 text-ink-900', 'bg-lagon-400 text-ink-900']

export function HowItWorks() {
  return (
    <section className="w-full mt-16 p-6 sm:p-10 rounded-[28px] bg-paper-2 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-8 lg:gap-16">
      <h2 className="text-2xl text-ink-900">Comment fonctionne la roulette</h2>
      <ol className="divide-y-2 divide-dashed divide-rule-strong">
        {steps.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 py-5">
            <span className={`h-10 w-10 rounded-full flex items-center justify-center font-display text-lg font-semibold ${STEP_TONES[i % STEP_TONES.length]}`} aria-hidden="true">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-lg text-ink-900">{step.title}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
