'use client'

import { Play, Calendar, Target, Trophy, Share2 } from 'lucide-react'

interface MobileNavbarProps {
  playerEmail: string | null
  playerName: string | null
  activeTab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges'
  setActiveTab: (tab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges') => void
  gameMode?: 'ROULETTE' | 'DRAW'
}

export function MobileNavbar({
  playerEmail,
  playerName,
  activeTab,
  setActiveTab,
  gameMode = 'ROULETTE',
}: MobileNavbarProps) {
  if (!playerEmail || !playerName) return null

  const allTabs = [
    { id: 'game', label: 'Jouer', icon: Play },
    { id: 'draws', label: 'Tirages', icon: Calendar },
    { id: 'challenges', label: 'Défis', icon: Target },
    { id: 'prizes', label: 'Mes lots', icon: Trophy },
    { id: 'referral', label: 'Parrainage', icon: Share2 }
  ] as const

  const tabs = gameMode === 'DRAW'
    ? allTabs.filter(t => t.id === 'draws' || t.id === 'prizes')
    : allTabs.filter(t => t.id !== 'draws')

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-surface border border-rule p-1 rounded-full z-50 flex items-center justify-around md:hidden" style={{ boxShadow: 'var(--shadow-premium-lg)' }}>
      {tabs.map((t) => {
        const Icon = t.icon
        const isActive = activeTab === t.id
        return (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id)
              const element = document.getElementById('play-zone')
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-12 rounded-full transition-colors cursor-pointer ${
              isActive ? 'bg-brand-600 text-white font-bold' : 'text-ink-700 hover:text-ink-900'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="text-[11px]">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
