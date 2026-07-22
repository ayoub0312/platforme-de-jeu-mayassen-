'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Trophy, Calendar, Users2, Save, CheckCircle2, Mail, Phone, ChevronDown } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// Convertit une date (UTC en base) vers la valeur attendue par <input
// type="datetime-local"> = heure LOCALE au format YYYY-MM-DDTHH:mm. Sans cet
// ajustement du décalage horaire, l'heure dérivait à chaque enregistrement.
function toLocalDatetimeInput(date: Date | string): string {
  const d = new Date(date)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

interface DrawManagementModalProps {
  open: boolean
  campaignId: string | null
  onClose: () => void
}

type ConfirmState = { title: string; description: string; onConfirm: () => void } | null

export function DrawManagementModal({ open, campaignId, onClose }: DrawManagementModalProps) {
  const toast = useToast()
  const utils = trpc.useUtils()
  const overviewQuery = trpc.getDrawCampaignOverview.useQuery({ campaignId: campaignId! }, { enabled: open && !!campaignId })
  const updateSettingsMut = trpc.updateDrawSettings.useMutation()
  const updateWinnerCountMut = trpc.updatePrizeWinnerCount.useMutation()
  const runDrawMut = trpc.runDraw.useMutation()

  const [allowMultipleWins, setAllowMultipleWins] = useState(true)
  const [drawDate, setDrawDate] = useState('')
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [showParticipants, setShowParticipants] = useState(false)

  const data = overviewQuery.data

  useEffect(() => {
    if (data) {
      setAllowMultipleWins(data.allowMultipleWins)
      setDrawDate(data.drawDate ? toLocalDatetimeInput(data.drawDate) : '')
    }
  }, [data])

  if (!open || !campaignId) return null

  const refreshAll = () => {
    utils.getDrawCampaignOverview.invalidate({ campaignId })
    utils.getAllWinners.invalidate()
    utils.getAllPrizes.invalidate()
  }

  const handleSaveSettings = async () => {
    try {
      await updateSettingsMut.mutateAsync({
        campaignId,
        allowMultipleWins,
        drawDate: drawDate ? new Date(drawDate) : null,
      })
      toast.success('Réglages du tirage enregistrés.')
      refreshAll()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement.")
    }
  }

  const handleWinnerCountChange = async (prizeId: string, value: number) => {
    const clamped = Math.max(1, Math.round(value) || 1)
    try {
      await updateWinnerCountMut.mutateAsync({ prizeId, totalStock: clamped })
      refreshAll()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour.')
    }
  }

  const executeDraw = (prizeId: string) => {
    runDrawMut.mutate(
      { prizeId },
      {
        onSuccess: (res) => {
          const names = res.winners.map((w) => w.name || w.email).join(', ')
          toast.success(`Tirage effectué ! Gagnant(s) : ${names}`)
          refreshAll()
        },
        onError: (err) => toast.error(err.message || 'Erreur lors du tirage au sort.'),
      }
    )
  }

  const handleLaunchDraw = (prize: NonNullable<typeof data>['prizes'][number]) => {
    const winnersToDrawCount = Math.min(prize.totalStock, prize.participantCount)
    const recap: ConfirmState = {
      title: 'Lancer le tirage ?',
      description: `Tirer ${winnersToDrawCount} gagnant(s) parmi ${prize.participantCount} inscrit(s) pour « ${prize.name} » ? Cette action est irréversible.`,
      onConfirm: () => {
        setConfirmState(null)
        executeDraw(prize.id)
      },
    }

    if (prize.participantCount < prize.totalStock) {
      setConfirmState({
        title: "Pas assez d'inscrits",
        description: `Seulement ${prize.participantCount} inscrit(s) pour ${prize.totalStock} gagnant(s) prévu(s) — tous les inscrits seront désignés gagnants. Continuer ?`,
        onConfirm: () => setConfirmState(recap),
      })
    } else {
      setConfirmState(recap)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-100 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800 z-10 cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          <h3 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-[#FF6B47]" />
            Gestion du tirage {data ? `« ${data.title} »` : ''}
          </h3>
          <p className="text-slate-400 text-xs font-semibold mb-6">Réglages, inscrits et lancement du tirage, lot par lot.</p>

          {!data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 text-[#FF6B47] animate-spin" />
            </div>
          ) : (
            <>
              {/* Réglages globaux de la campagne */}
              <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-5 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase tracking-wide mb-2">
                      <Calendar className="h-3.5 w-3.5 text-[#FF6B47]" /> Date du tirage
                    </label>
                    <input
                      type="datetime-local"
                      value={drawDate}
                      onChange={(e) => setDrawDate(e.target.value)}
                      className="w-full bg-white border border-orange-200 text-slate-900 px-4 h-12 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase tracking-wide mb-2">
                      <Users2 className="h-3.5 w-3.5 text-[#FF6B47]" /> Un participant peut gagner plusieurs lots ?
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAllowMultipleWins(true)}
                        className={`flex-1 px-4 h-12 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          allowMultipleWins ? 'bg-[#FF6B47] border-[#FF6B47] text-white' : 'bg-white border-orange-200 text-slate-500 hover:bg-orange-50'
                        }`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowMultipleWins(false)}
                        className={`flex-1 px-4 h-12 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          !allowMultipleWins ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-orange-200 text-slate-500 hover:bg-orange-50'
                        }`}
                      >
                        Non
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMut.isPending}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-60"
                >
                  {updateSettingsMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer les réglages
                </button>
              </div>

              {/* Participants inscrits au tirage */}
              <div className="border border-slate-200 rounded-2xl mb-6 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowParticipants((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-wide">
                    <Users2 className="h-4 w-4 text-[#FF6B47]" />
                    Participants inscrits ({data.participants.length})
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showParticipants ? 'rotate-180' : ''}`} />
                </button>
                {showParticipants && (
                  data.participants.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {data.participants.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                          <span className="w-6 shrink-0 text-[11px] font-bold text-slate-300">{i + 1}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{p.name || 'Anonyme'}</div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</span>
                              {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-4 text-xs text-slate-400">Aucun inscrit au tirage pour le moment.</p>
                  )
                )}
              </div>

              {/* Lots */}
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Lots à gagner</label>
              <div className="space-y-3">
                {data.prizes.map((prize) => {
                  const isDrawn = prize.winners.length > 0
                  const canDraw = !isDrawn && prize.participantCount > 0

                  return (
                    <div key={prize.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-bold text-sm text-slate-800 truncate">{prize.name}</span>
                          <span className="shrink-0 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1">
                            🎫 {prize.participantCount} inscrit{prize.participantCount > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Gagnants</label>
                          <input
                            type="number"
                            min={1}
                            defaultValue={prize.totalStock}
                            disabled={isDrawn}
                            onBlur={(e) => {
                              const v = Math.max(1, Number(e.target.value) || 1)
                              if (v !== prize.totalStock) handleWinnerCountChange(prize.id, v)
                            }}
                            className="w-16 bg-white border border-slate-200 text-slate-900 px-2 h-9 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#FF6B47] disabled:opacity-60"
                          />

                          {isDrawn ? (
                            <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-2">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Tiré
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!canDraw || runDrawMut.isPending}
                              onClick={() => handleLaunchDraw(prize)}
                              title={prize.participantCount === 0 ? 'Aucun inscrit' : 'Lancer le tirage'}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-all border shadow-sm ${
                                canDraw
                                  ? 'bg-[#FF6B47] hover:bg-[#e85530] border-[#FF6B47] text-white cursor-pointer'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {runDrawMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '🏆'} Tirage
                            </button>
                          )}
                        </div>
                      </div>

                      {!canDraw && !isDrawn && (
                        <p className="text-[11px] text-slate-400 mt-1.5">Aucun inscrit pour le moment — le tirage sera possible dès la première inscription.</p>
                      )}

                      {isDrawn && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-xs text-slate-600">
                          <span className="font-bold text-slate-700">Gagnant(s) : </span>
                          {prize.winners.map((w) => w.name || w.email).join(', ')}
                          <span className="text-slate-400"> — tiré le {new Date(prize.winners[0].claimedAt).toLocaleString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {confirmState && (
        <ConfirmModal
          open
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel="Continuer"
          danger={false}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}
