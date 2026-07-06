'use client'

import { motion } from 'framer-motion'
import { Sparkles, Ticket } from 'lucide-react'

interface StepGameTypeProps {
  gameMode: 'ROULETTE' | 'DRAW'
  onChange: (mode: 'ROULETTE' | 'DRAW') => void
}

const OPTIONS = [
  {
    value: 'ROULETTE' as const,
    icon: Sparkles,
    title: 'Roulette',
    desc: 'Le joueur lance la roue immédiatement après inscription. Résultat instantané.',
  },
  {
    value: 'DRAW' as const,
    icon: Ticket,
    title: 'Tirage au sort',
    desc: "Le joueur s'inscrit, puis un ou plusieurs gagnants sont tirés au sort à une date fixée.",
  },
]

export function StepGameType({ gameMode, onChange }: StepGameTypeProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const selected = gameMode === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative text-left p-5 rounded-[var(--radius-ds-lg)] border-2 transition-all cursor-pointer ${
              selected ? 'border-brand-500 bg-brand-50' : 'border-black/[0.08] bg-surface hover:border-black/[0.15]'
            }`}
          >
            {selected && (
              <motion.div
                layoutId="game-type-check"
                className="absolute top-4 right-4 h-6 w-6 rounded-full bg-gradient-brand-signature flex items-center justify-center text-white text-xs font-black"
              >
                ✓
              </motion.div>
            )}
            <div className={`h-12 w-12 rounded-[var(--radius-ds-md)] flex items-center justify-center mb-3 ${
              selected ? 'bg-gradient-brand-signature text-white' : 'bg-surface-alt text-ink-500'
            }`}>
              <Icon className="h-6 w-6" />
            </div>
            <h4 className="font-display text-lg font-semibold text-ink-900">{opt.title}</h4>
            <p className="text-ink-500 text-xs mt-1.5 leading-relaxed">{opt.desc}</p>
          </button>
        )
      })}
    </div>
  )
}
