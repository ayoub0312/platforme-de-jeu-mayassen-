'use client'

import { Play, Calendar, Target, Trophy, Share2 } from 'lucide-react'

interface TabNavigationProps {
  activeTab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges'
  setActiveTab: (tab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges') => void
  gameMode?: 'ROULETTE' | 'DRAW'
}

export function TabNavigation({ activeTab, setActiveTab, gameMode = 'ROULETTE' }: TabNavigationProps) {
  const allTabs = [
    { id: 'game', label: 'Lancer', icon: Play },
    { id: 'draws', label: 'Tirages', icon: Calendar },
    { id: 'challenges', label: 'Défis', icon: Target },
    { id: 'prizes', label: 'Lots', icon: Trophy },
    { id: 'referral', label: ' partage', icon: Share2 }
  ] as const

  // A campaign is either Roulette (Lancer/Défis/Partage) or Tirage au Sort (Tirages) — never both.
  const tabs = gameMode === 'DRAW'
    ? allTabs.filter(t => t.id === 'draws' || t.id === 'prizes')
    : allTabs.filter(t => t.id !== 'draws')

  return (
    <div className="hidden md:flex w-full items-center bg-slate-100/80 border border-slate-200 mb-6 p-1 rounded-2xl">
      {tabs.map((t) => {
        const Icon = t.icon
        const isActive = activeTab === t.id
        return (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isActive
                ? 'bg-white text-[#FF6B47] border border-[#FF6B47] shadow-sm'
                : 'text-slate-800 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-[#FF6B47]' : 'text-slate-800'}`} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
