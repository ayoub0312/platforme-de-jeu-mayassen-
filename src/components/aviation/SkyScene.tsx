'use client'

import { useId } from 'react'
import { useReducedMotion } from 'framer-motion'

// Scène de ciel au crépuscule : trajectoire pointillée + avion qui la suit.
// Purement décorative (aria-hidden). Sert de fond au hero quand aucune vidéo
// n'est configurée, et au panneau des pages de connexion.
const ROUTE = 'M 640 330 C 760 120, 960 70, 1120 190'
const STARS: [number, number][] = [
  [120, 80], [260, 150], [420, 60], [610, 120], [780, 50], [930, 140], [1080, 70], [1150, 190], [340, 240], [860, 230],
]

const DEFAULT_ROUTE_CLS = 'absolute right-[-1%] top-[9%] hidden w-[42%] max-w-[680px] lg:block'

export function SkyScene({ className = '', routeClassName = DEFAULT_ROUTE_CLS }: { className?: string; routeClassName?: string }) {
  const routeId = `sky-route-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={`absolute inset-0 overflow-hidden bg-ink-900 ${className}`} aria-hidden="true">
      {/* Halo de soleil couchant à l'horizon */}
      <div className="absolute -bottom-1/3 left-1/2 h-[120%] w-[140%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,oklch(70%_0.19_38/0.55),oklch(70%_0.19_38/0.12)_55%,transparent_75%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        {STARS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.3} fill="white" opacity={i % 2 ? 0.55 : 0.8} />
        ))}

      </svg>
      {/* Trajectoire et avion : ancrés en haut à droite, hors de la zone du texte */}
      <svg className={routeClassName} viewBox="600 40 600 340" preserveAspectRatio="xMidYMid meet">
        <path id={routeId} d={ROUTE} fill="none" stroke="var(--ambre-300)" strokeWidth="2.5" strokeDasharray="2 12" strokeLinecap="round" opacity="0.9" />

        <circle cx="640" cy="330" r="9" fill="var(--lagon-400)" />
        <circle cx="640" cy="330" r="18" fill="none" stroke="var(--lagon-400)" strokeWidth="2" opacity="0.5" />

        <g transform="translate(1120 190)">
          <circle r="22" fill="var(--brand-500)" opacity="0.25" />
          <path d="M0 -26 C 14 -26 22 -16 22 -4 C 22 12 0 30 0 30 C 0 30 -22 12 -22 -4 C -22 -16 -14 -26 0 -26 Z" fill="var(--brand-500)" />
          <circle cy="-4" r="7" fill="var(--ink-900)" />
        </g>

        <g transform={prefersReducedMotion ? 'translate(880 98) rotate(-8)' : undefined}>
          <path
            d="M22 0 L4 -5 L-4 -20 L-10 -20 L-6 -5 L-16 -5 L-21 -11 L-25 -11 L-22 0 L-25 11 L-21 11 L-16 5 L-6 5 L-10 20 L-4 20 L4 5 Z"
            fill="white"
            transform="scale(1.1)"
          />
          {!prefersReducedMotion && (
            <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
              <mpath href={`#${routeId}`} />
            </animateMotion>
          )}
        </g>
      </svg>
    </div>
  )
}
