'use client'

import { Play, Calendar, Target, Trophy, Share2 } from 'lucide-react'

interface TabNavigationProps {
  activeTab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges'
  setActiveTab: (tab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges') => void
  gameMode?: 'ROULETTE' | 'DRAW'
}

export function TabNavigation({ activeTab, setActiveTab, gameMode = 'ROULETTE' }: TabNavigationProps) {
  const allTabs = [
    { id: 'game', label: 'Jouer', icon: Play },
    { id: 'draws', label: 'Tirages', icon: Calendar },
    { id: 'challenges', label: 'Défis', icon: Target },
    { id: 'prizes', label: 'Mes lots', icon: Trophy },
    { id: 'referral', label: 'Parrainage', icon: Share2 }
  ] as const

  // A campaign is either Roulette (Lancer/Défis/Partage) or Tirage au Sort (Tirages) — never both.
  const tabs = gameMode === 'DRAW'
    ? allTabs.filter(t => t.id === 'draws' || t.id === 'prizes')
    : allTabs.filter(t => t.id !== 'draws')

  return (
    <div role="tablist" className="hidden md:flex w-full items-center gap-1 mb-8 p-1.5 rounded-full bg-paper-2">
      {tabs.map((t) => {
        const Icon = t.icon
        const isActive = activeTab === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full text-sm font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-brand-600 text-white shadow-[0_3px_0_var(--brand-700)]'
                : 'text-ink-700 hover:text-ink-900 hover:bg-white/70'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
