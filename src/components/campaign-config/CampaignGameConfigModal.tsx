'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { RouletteConfigEditor } from './RouletteConfigEditor'
import { DrawConfigEditor } from './DrawConfigEditor'
import type { GameConfigData } from './types'

interface CampaignGameConfigModalProps {
  open: boolean
  onClose: () => void
  campaignId: string | null
}

export function CampaignGameConfigModal({ open, onClose, campaignId }: CampaignGameConfigModalProps) {
  const [data, setData] = useState<GameConfigData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const campaignQuery = trpc.getCampaignWithPrizes.useQuery({ id: campaignId! }, { enabled: !!campaignId && open })
  const utils = trpc.useUtils()
  const upsertPrizesMut = trpc.upsertPrizesForCampaign.useMutation()
  const updateGameConfigMut = trpc.updateCampaignGameConfig.useMutation()

  useEffect(() => {
    if (!campaignQuery.data) return
    const c = campaignQuery.data
    setData({
      campaignId: c.id,
      gameMode: c.gameMode,
      templateUsed: c.templateUsed,
      spinsPerClient: c.spinsPerClient,
      postSignupMessage: c.postSignupMessage || '',
      prizes: c.prizes.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color || '#FF6B47',
        imageData: p.imageData,
        imageMimeType: p.imageMimeType,
        winProbability: p.winProbability,
        totalStock: p.totalStock,
        type: p.type,
        fallbackPrizeId: p.fallbackPrizeId,
        drawDate: p.drawDate ? new Date(p.drawDate).toISOString() : null,
        validityDays: p.validityDays ?? 30,
        order: p.order,
      })),
    })
  }, [campaignQuery.data])

  useEffect(() => {
    if (!open) {
      setData(null)
      setError(null)
    }
  }, [open])

  if (!open || !campaignId) return null

  const handleSave = async () => {
    if (!data) return
    setError(null)

    if (data.gameMode === 'ROULETTE') {
      const sum = data.prizes.reduce((acc, p) => acc + p.winProbability, 0)
      if (data.prizes.length < 2) {
        setError('Ajoutez au moins 2 segments.')
        return
      }
      if (Math.abs(sum - 1) > 0.011) {
        setError(`La somme des probabilités doit être 100% (actuellement ${Math.round(sum * 100)}%).`)
        return
      }
    } else {
      if (data.prizes.length === 0) {
        setError('Ajoutez au moins un lot.')
        return
      }
      if (!data.prizes[0]?.drawDate) {
        setError('Renseignez la date du tirage.')
        return
      }
    }

    try {
      await updateGameConfigMut.mutateAsync({
        id: data.campaignId,
        spinsPerClient: data.spinsPerClient,
        postSignupMessage: data.postSignupMessage || null,
      })
      await upsertPrizesMut.mutateAsync({
        campaignId: data.campaignId,
        prizes: data.prizes.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          totalStock: p.totalStock,
          winProbability: p.winProbability,
          color: p.color,
          imageData: p.imageData,
          imageMimeType: p.imageMimeType,
          fallbackPrizeId: p.fallbackPrizeId,
          drawDate: p.drawDate ? new Date(p.drawDate) : null,
          validityDays: p.validityDays,
          order: p.order,
        })),
      })
      await utils.getAllPrizes.invalidate()
      onClose()
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.")
    }
  }

  const isSaving = upsertPrizesMut.isPending || updateGameConfigMut.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-6xl border border-slate-100 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800 z-10 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          <h3 className="text-2xl font-black text-slate-800 mb-1">
            Configurer {campaignQuery.data ? `« ${campaignQuery.data.title} »` : ''}
          </h3>
          <p className="text-slate-400 text-xs font-semibold mb-6">
            {data?.gameMode === 'DRAW' ? 'Tirage au sort : date, lots et message.' : 'Roulette : segments, couleurs, probabilités et aperçu live.'}
          </p>

          {!data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 text-[#FF6B47] animate-spin" />
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
                  {error}
                </div>
              )}

              {data.gameMode === 'ROULETTE' ? (
                <RouletteConfigEditor data={data} setData={setData as any} />
              ) : (
                <DrawConfigEditor data={data} setData={setData as any} />
              )}

              <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-slate-100">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
