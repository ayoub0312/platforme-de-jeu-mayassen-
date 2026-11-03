import { Plane } from 'lucide-react'

const steps = [
  {
    title: 'Choisissez un jeu',
    desc: "Séjours à l'hôtel, circuits, offres Omra ou bons d'achat : chaque jeu affiche ses lots et sa date de fin.",
  },
  {
    title: 'Inscrivez-vous',
    desc: 'Nom et email suffisent pour recevoir vos lancers ou votre participation au tirage.',
  },
  {
    title: 'Jouez, puis récupérez votre lot',
    desc: 'En cas de gain, vous recevez un bon par email avec un QR code à présenter au partenaire.',
  },
]

const STOP_TONES = ['bg-lagon-400', 'bg-ambre-400', 'bg-brand-500']

// Itinéraire en trois escales reliées par un trajet pointillé (fond bleu nuit).
export function HowItWorksTimeline() {
  return (
    <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
      {/* Trajet : horizontal au-delà de md, vertical en dessous */}
      <span aria-hidden="true" className="absolute left-5 top-5 bottom-5 w-0 border-l-2 border-dashed border-white/25 md:left-5 md:right-10 md:top-5 md:bottom-auto md:w-auto md:h-0 md:border-l-0 md:border-t-2" />
      <Plane aria-hidden="true" className="hidden md:block absolute right-0 -top-[2px] h-8 w-8 rotate-45 text-ambre-300" strokeWidth={1.75} />

      {steps.map((step, i) => (
        <li key={step.title} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 md:grid-cols-1 md:gap-5">
          <span className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center font-display text-lg font-semibold text-ink-900 shadow-[0_0_0_6px_var(--ink-900)] ${STOP_TONES[i]}`}>
            {i + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-2xl text-white">{step.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/70 max-w-xs">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
