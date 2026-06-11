'use client'

import { Play, Calendar, Target, Trophy, Share2 } from 'lucide-react'

interface MobileNavbarProps {
  playerEmail: string | null
  playerName: string | null
  activeTab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges'
  setActiveTab: (tab: 'game' | 'draws' | 'prizes' | 'referral' | 'challenges') => void
}

export function MobileNavbar({
  playerEmail,
  playerName,
  activeTab,
  setActiveTab,
}: MobileNavbarProps) {
  if (!playerEmail || !playerName) return null

  const tabs = [
    { id: 'game', label: 'Lancer', icon: Play },
    { id: 'draws', label: 'Tirages', icon: Calendar },
    { id: 'challenges', label: 'Défis', icon: Target },
    { id: 'prizes', label: 'Lots', icon: Trophy },
    { id: 'referral', label: 'partage', icon: Share2 }
  ] as const

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-slate-50/95 backdrop-blur-md border border-slate-200/80 p-1 rounded-2xl shadow-xl z-50 flex items-center justify-around md:hidden animate-fade-in">
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
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl transition-all border cursor-pointer ${
              isActive
                ? 'bg-white border-[#FF8C00] text-[#FF8C00] font-bold shadow-sm'
                : 'border-transparent text-slate-800 hover:text-slate-950'
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-[#FF8C00]' : 'text-slate-800'}`} />
            <span className="text-[9px]">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
