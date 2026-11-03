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

export function HowItWorks() {
  return (
    <section className="w-full mt-16 pt-10 border-t border-rule grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-8 lg:gap-16">
      <h2 className="text-xl font-semibold tracking-tight text-ink-900">Comment fonctionne la roulette</h2>
      <ol className="divide-y divide-rule border-y border-rule">
        {steps.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 py-5">
            <span className="text-sm font-medium text-ink-500 tabular-nums pt-0.5" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-ink-900">{step.title}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
