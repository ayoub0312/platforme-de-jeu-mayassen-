'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X, Search, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { UserSession } from '@/lib/auth'

export interface AdminNavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export interface AdminLayoutProps {
  session: UserSession
  navItems: AdminNavItem[]
  activeId: string
  onNavigate: (id: string) => void
  onLogout: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  children: React.ReactNode
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super administrateur',
  PARTNER: 'Partenaire',
  PLAYER: 'Joueur',
  READONLY: 'Lecteur',
}

const WORKSPACE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Administration',
  PARTNER: 'Espace partenaire',
  READONLY: 'Administration',
}

export function AdminLayout({
  session,
  navItems,
  activeId,
  onNavigate,
  onLogout,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const activeItem = navItems.find((n) => n.id === activeId)
  const initials = session.email.slice(0, 2).toUpperCase()

  useEffect(() => {
    setMobileOpen(false)
  }, [activeId])

  const sidebarContent = (
    <>
      <div className={`flex items-center gap-2.5 h-16 shrink-0 ${collapsed ? 'justify-center' : 'px-5'}`}>
        <span className="h-8 w-8 rounded-xl bg-brand-500 flex items-center justify-center text-white font-display text-base font-semibold shrink-0" aria-hidden="true">
          O
        </span>
        {!collapsed && (
          <span className="font-display text-[17px] font-semibold text-white">Obooking Gift</span>
        )}
      </div>

      {!collapsed && (
        <p className="px-5 pt-2 pb-2 text-xs font-semibold text-white/50">{WORKSPACE_LABELS[session.role] ?? 'Espace'}</p>
      )}

      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5" aria-label="Navigation principale">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`relative w-full flex items-center gap-2.5 h-10 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                collapsed ? 'justify-center' : 'px-3'
              } ${
                isActive
                  ? 'bg-brand-600 text-white shadow-[0_3px_0_var(--brand-700)]'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-white/55'}`} />
              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {!!item.badge && (
                    <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-ambre-400 text-ink-900 tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={`hidden lg:flex items-center gap-2 h-11 shrink-0 text-white/50 hover:text-white text-xs font-semibold cursor-pointer border-t border-white/10 ${collapsed ? 'justify-center' : 'px-5'}`}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed && <span>Réduire le menu</span>}
      </button>
    </>
  )

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen bg-ink-900 transition-[width] duration-200 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-ink-900 lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="absolute right-3 top-3.5 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-14 shrink-0 flex items-center gap-3 px-4 sm:px-6 lg:px-8 border-b border-rule bg-paper">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="lg:hidden p-2 -ml-2 rounded-lg text-ink-700 hover:bg-black/[0.04] cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="hidden sm:inline text-ink-500 whitespace-nowrap">{WORKSPACE_LABELS[session.role] ?? 'Espace'}</span>
            <span className="hidden sm:inline text-ink-500/50" aria-hidden="true">/</span>
            <span className="text-ink-900 font-semibold truncate">{activeItem?.label ?? ''}</span>
          </div>

          {onSearchChange && (
            <div className="relative flex-1 max-w-xs ml-4 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
              <input
                type="search"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface border border-rule text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          )}

          <div className="ml-auto relative">
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-black/[0.04] cursor-pointer"
            >
              <span className="h-8 w-8 rounded-full bg-lagon-400 text-ink-900 flex items-center justify-center text-[11px] font-bold shrink-0">
                {initials}
              </span>
              <span className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                <span className="text-[13px] font-medium text-ink-900 max-w-[180px] truncate">{session.email}</span>
                <span className="text-[11px] text-ink-500">{ROLE_LABELS[session.role] ?? session.role}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-500 shrink-0" />
            </button>

            <AnimatePresence>
              {avatarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setAvatarMenuOpen(false)} />
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-surface border border-rule p-1.5 z-40"
                    style={{ boxShadow: 'var(--shadow-premium-lg)' }}
                  >
                    <div className="px-3 py-2.5 border-b border-rule mb-1">
                      <p className="text-[13px] font-medium text-ink-900 truncate">{session.email}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{ROLE_LABELS[session.role] ?? session.role}</p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm text-ink-700 hover:text-[var(--danger)] hover:bg-[var(--danger)]/[0.06] cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Se déconnecter
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
