'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Phone, Check } from 'lucide-react'
import { trpc } from '@/utils/trpc'

// Styles de champ repris du langage de la home (barre de recherche du hero) :
// fond blanc, bordure slate-200/80, focus coloré + halo + très léger scale.
// Deux teintes d'accent (Corail = identité, Lagon = contact) pour renforcer
// la lecture des deux sections du passeport.
const fieldClass = (accent: 'corail' | 'lagon') =>
  `w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200/80 bg-white text-sm text-[#1a1a1a] placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:scale-[1.01] ${
    accent === 'corail'
      ? 'focus:border-[#FF6B47] focus:ring-4 focus:ring-orange-500/10'
      : 'focus:border-[#0EA5A0] focus:ring-4 focus:ring-[#0EA5A0]/10'
  }`

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
}

// Motif "code-barres" décoratif sur le talon — purement visuel, motif fixe
// (jamais Math.random() au rendu, pour ne jamais créer d'écart SSR/CSR).
const BARCODE_PATTERN = [3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1]

function BoardingPassStub() {
  return (
    <div
      className="hidden sm:flex relative w-20 shrink-0 flex-col items-center justify-between py-8 border-l border-dashed border-slate-900/15 bg-gradient-to-b from-[#FF6B47]/[0.04] to-[#0EA5A0]/[0.06]"
      aria-hidden="true"
    >
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-[#F7F7F4]" />
      <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-[#F7F7F4]" />

      <div className="flex gap-[2px] h-10 items-end">
        {BARCODE_PATTERN.map((w, i) => (
          <div
            key={i}
            style={{ width: w, height: `${40 + (i % 3) * 20}%` }}
            className={i % 5 === 0 ? 'bg-[#FF6B47]/50' : 'bg-slate-900/20'}
          />
        ))}
      </div>

      <span
        className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 whitespace-nowrap"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        Obooking · Passeport
      </span>
    </div>
  )
}

export default function MesInformationsPage() {
  const { data: profile, isLoading, refetch } = trpc.getMyProfile.useQuery()
  const updateMut = trpc.updateMyProfile.useMutation()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' })
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(false)
    await updateMut.mutateAsync(form)
    setSaved(true)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="h-3 w-32 rounded skeleton-shimmer mb-3" />
        <div className="h-7 w-56 rounded skeleton-shimmer mb-8" />
        <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden" style={{ boxShadow: 'var(--shadow-premium-lg)' }}>
          <div className="p-7 sm:p-8 space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 w-20 rounded skeleton-shimmer mb-2" />
                <div className="h-11 w-full rounded-xl skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="max-w-2xl" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="mb-6">
        <span className="inline-block text-[10px] font-black uppercase tracking-wider text-[#FF6B47] mb-1.5">
          Passeport · Identité
        </span>
        <h1 className="font-display text-2xl font-semibold text-[#1a1a1a]">Mes informations</h1>
        <p className="text-sm text-[#1a1a1a]/50 mt-1">Votre profil personnel.</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        variants={itemVariants}
        className="relative flex bg-white border border-slate-200/80 rounded-3xl overflow-hidden"
        style={{ boxShadow: 'var(--shadow-premium-lg)' }}
      >
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {/* Filigrane — monogramme très pâle, purement décoratif */}
          <span
            className="pointer-events-none select-none absolute -bottom-8 -right-4 font-display font-bold text-[150px] leading-none text-[#FF6B47]/[0.035]"
            aria-hidden="true"
          >
            OB
          </span>

          <div className="relative z-10">
            {/* Section Identité */}
            <motion.div variants={itemVariants} className="p-7 sm:p-8 space-y-5">
              <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Identité</h2>

              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-[#1a1a1a]/60 mb-1.5">
                  Nom
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FF6B47]/60 pointer-events-none" aria-hidden="true" />
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className={fieldClass('corail')}
                  />
                </div>
              </div>
            </motion.div>

            {/* Perforation horizontale — séparation façon boarding pass */}
            <motion.div
              variants={itemVariants}
              className="relative mx-7 sm:mx-8 h-0 border-t border-dashed border-slate-900/15"
              aria-hidden="true"
            >
              <span className="absolute left-0 -translate-x-1/2 -top-2.5 h-5 w-5 rounded-full bg-[#F7F7F4]" />
              <span className="absolute right-0 translate-x-1/2 -top-2.5 h-5 w-5 rounded-full bg-[#F7F7F4]" />
            </motion.div>

            {/* Section Contact */}
            <motion.div variants={itemVariants} className="p-7 sm:p-8 space-y-5">
              <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contact</h2>

              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a]/60 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0EA5A0]/70 pointer-events-none" aria-hidden="true" />
                  <div className="h-11 pl-10 pr-3.5 flex items-center rounded-xl border border-slate-200/80 bg-slate-50 text-sm font-mono text-[#1a1a1a]/70">
                    {profile?.email}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-[#1a1a1a]/60 mb-1.5">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0EA5A0]/70 pointer-events-none" aria-hidden="true" />
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className={fieldClass('lagon')}
                  />
                </div>
              </div>
            </motion.div>

            {/* Footer / action */}
            <motion.div
              variants={itemVariants}
              className="px-7 sm:px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center gap-3"
            >
              <motion.button
                type="submit"
                disabled={updateMut.isPending}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="bg-gradient-brand text-white rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                style={{ boxShadow: 'var(--shadow-premium-glow)' }}
              >
                {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </motion.button>
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0EA5A0]"
                  >
                    <Check className="h-3.5 w-3.5" /> Enregistré
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        <BoardingPassStub />
      </motion.form>
    </motion.div>
  )
}
