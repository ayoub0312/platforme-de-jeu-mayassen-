'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X, Search, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { UserSession } from '@/lib/auth'

export interface AdminNavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
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

  useEffect(() => {
    setMobileOpen(false)
  }, [activeId])

  const sidebarContent = (
    <>
      <div className={`flex items-center gap-2.5 px-4 h-16 shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="h-9 w-9 rounded-xl bg-gradient-brand-signature flex items-center justify-center text-white font-display font-bold text-lg shrink-0">
          O
        </div>
        {!collapsed && (
          <span className="font-display font-semibold text-white text-lg tracking-tight">Obooking Gift</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1">
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
              className={`w-full flex items-center gap-3 px-3 h-11 rounded-[var(--radius-ds-sm)] text-sm font-bold transition-colors cursor-pointer ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-gradient-brand-signature text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="hidden lg:flex items-center gap-2.5 px-4 h-12 shrink-0 text-white/50 hover:text-white text-xs font-bold cursor-pointer border-t border-white/10"
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed && <span>Réduire</span>}
      </button>
    </>
  )

  return (
    <div className="min-h-screen flex bg-surface-alt">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-surface-dark transition-[width] duration-200 ${
          collapsed ? 'w-[76px]' : 'w-64'
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
              className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-surface-dark lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="absolute right-3 top-3 p-2 rounded-lg text-white/60 hover:text-white cursor-pointer"
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
        {/* Topbar */}
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-black/[0.06] bg-surface">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="lg:hidden p-2 -ml-2 rounded-lg text-ink-700 hover:bg-black/[0.04] cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink-500 min-w-0">
            <span className="hidden sm:inline">Administration</span>
            <span className="hidden sm:inline text-ink-500/40">/</span>
            <span className="text-ink-900 truncate">{activeItem?.label ?? ''}</span>
          </div>

          {onSearchChange && (
            <div className="relative flex-1 max-w-sm ml-2 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
              <input
                type="text"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-3 rounded-[var(--radius-ds-sm)] bg-surface-alt border border-black/[0.06] text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
              />
            </div>
          )}

          <div className="ml-auto relative">
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
              className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-ds-sm)] hover:bg-black/[0.04] cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-brand-signature text-white flex items-center justify-center text-xs font-black uppercase shrink-0">
                {session.email.slice(0, 2)}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-bold text-ink-900 max-w-[140px] truncate">{session.email}</span>
                <span className="text-[10px] font-black uppercase tracking-wide text-brand-600">
                  {ROLE_LABELS[session.role] ?? session.role}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-ink-500 shrink-0" />
            </button>

            <AnimatePresence>
              {avatarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setAvatarMenuOpen(false)} />
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-[var(--radius-ds-md)] bg-surface border border-black/[0.06] p-2 z-40"
                    style={{ boxShadow: 'var(--shadow-premium-lg)' }}
                  >
                    <div className="px-3 py-2 border-b border-black/[0.06] mb-1">
                      <p className="text-xs font-bold text-ink-900 truncate">{session.email}</p>
                      <p className="text-[10px] font-black uppercase tracking-wide text-brand-600 mt-0.5">
                        {ROLE_LABELS[session.role] ?? session.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-ds-sm)] text-sm font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Se déconnecter
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
