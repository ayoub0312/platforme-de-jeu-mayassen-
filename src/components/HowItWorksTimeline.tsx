'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'framer-motion'
import { Search, ClipboardList, Sparkles } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Choisissez une offre',
    desc: "Explorez nos campagnes exclusives : séjours à l'hôtel, circuits organisés, offres Omra ou bons d'achat.",
  },
  {
    number: '02',
    icon: ClipboardList,
    title: 'Renseignez vos coordonnées',
    desc: 'Remplissez le formulaire de participation rapide pour obtenir vos jetons de jeu.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Jouez et gagnez !',
    desc: "Lancez l'instant gagnant ou participez aux tirages au sort pour remporter vos récompenses de voyage.",
  },
]

function ConnectingPath({ vertical, progress }: { vertical: boolean; progress: MotionValue<number> }) {
  return (
    <svg
      className="absolute"
      style={
        vertical
          ? { left: '50%', top: '4.5rem', bottom: '4.5rem', width: 2, transform: 'translateX(-50%)' }
          : { left: '16.66%', right: '16.66%', top: '4.5rem', height: 2 }
      }
      viewBox={vertical ? '0 0 4 100' : '0 0 100 4'}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="howItWorksLine" x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
          <stop offset="0%" stopColor="#FF6B47" />
          <stop offset="100%" stopColor="#182444" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path
        d={vertical ? 'M2,0 L2,100' : 'M0,2 L100,2'}
        stroke="#e2e8f0"
        strokeWidth={vertical ? 4 : 4}
        strokeDasharray="3 5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <motion.path
        d={vertical ? 'M2,0 L2,100' : 'M0,2 L100,2'}
        stroke="url(#howItWorksLine)"
        strokeWidth={vertical ? 4 : 4}
        strokeDasharray="3 5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ pathLength: progress }}
      />
    </svg>
  )
}

export function HowItWorksTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'start 0.2'],
  })
  const drawProgress = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [1, 1] : [0, 1])

  return (
    <div ref={containerRef} className="relative">
      {/* Connecting path — horizontal on desktop, vertical on mobile, draws in on scroll */}
      <div className="hidden md:block">
        <ConnectingPath vertical={false} progress={drawProgress} />
      </div>
      <div className="md:hidden">
        <ConnectingPath vertical={true} progress={drawProgress} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 28 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              whileHover={prefersReducedMotion ? undefined : { y: -8 }}
              className="group relative text-center p-8 bg-white rounded-3xl border border-slate-100 overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-premium-glow)]"
              style={{ boxShadow: 'var(--shadow-premium-md)' }}
            >
              {/* Giant translucent number, in the display font, sitting behind the content */}
              <span
                className="font-display absolute -top-4 right-1 text-[7rem] leading-none font-semibold text-orange-50 select-none pointer-events-none"
                aria-hidden="true"
              >
                {step.number}
              </span>

              <motion.div
                whileHover={prefersReducedMotion ? undefined : { scale: 1.12, rotate: 6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="relative z-10 h-16 w-16 bg-orange-50 text-[#FF6B47] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-orange-100 group-hover:shadow-[0_0_0_8px_rgba(255,107,71,0.08)] transition-shadow duration-300"
              >
                <Icon className="h-7 w-7" strokeWidth={2.25} />
              </motion.div>

              <h4 className="relative z-10 font-display text-lg font-semibold text-slate-900">{step.title}</h4>
              <p className="relative z-10 text-slate-550 text-xs leading-relaxed mt-2 font-medium">
                {step.desc}
              </p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
