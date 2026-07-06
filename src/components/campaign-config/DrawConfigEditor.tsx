'use client'

import { Trash2, Plus, ImageIcon } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import type { GameConfigData, ConfigPrize } from './types'

function makePrize(order: number): ConfigPrize {
  return {
    name: `Lot ${order + 1}`,
    color: '#F97316',
    imageData: null,
    imageMimeType: null,
    winProbability: 0,
    totalStock: 1,
    type: 'PHYSICAL',
    fallbackPrizeId: null,
    drawDate: null,
    validityDays: 30,
    order,
  }
}

interface DrawConfigEditorProps {
  data: GameConfigData
  setData: (updater: (prev: GameConfigData) => GameConfigData) => void
}

export function DrawConfigEditor({ data, setData }: DrawConfigEditorProps) {
  const templatesQuery = trpc.getCampaignTemplates.useQuery()
  const prizes = data.prizes
  const sharedDrawDate = prizes[0]?.drawDate || ''

  const updatePrize = (index: number, patch: Partial<ConfigPrize>) => {
    setData((p) => {
      const next = [...p.prizes]
      next[index] = { ...next[index], ...patch }
      return { ...p, prizes: next }
    })
  }

  const setDrawDateForAll = (value: string) => {
    setData((p) => ({ ...p, prizes: p.prizes.map((pr) => ({ ...pr, drawDate: value })) }))
  }

  const addPrize = () => {
    setData((p) => ({
      ...p,
      prizes: [...p.prizes, { ...makePrize(p.prizes.length), drawDate: sharedDrawDate || null }],
    }))
  }

  const deletePrize = (index: number) => {
    setData((p) => ({ ...p, prizes: p.prizes.filter((_, i) => i !== index).map((pr, i) => ({ ...pr, order: i })) }))
  }

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      updatePrize(index, { imageData: base64, imageMimeType: file.type })
    }
    reader.readAsDataURL(file)
  }

  const applyTemplate = (templateId: string) => {
    const tpl = templatesQuery.data?.find((t) => t.id === templateId && t.gameMode === 'DRAW')
    if (!tpl || !('prizes' in tpl)) return
    setData((p) => ({
      ...p,
      templateUsed: tpl.id,
      prizes: tpl.prizes.map((pr, i) => ({
        name: pr.name,
        color: '#F97316',
        imageData: null,
        imageMimeType: null,
        winProbability: 0,
        totalStock: pr.totalStock,
        type: 'PHYSICAL',
        fallbackPrizeId: null,
        drawDate: sharedDrawDate || null,
        validityDays: 30,
        order: i,
      })),
    }))
  }

  return (
    <div className="space-y-6">
      {templatesQuery.data && templatesQuery.data.some((t) => t.gameMode === 'DRAW') && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-400 self-center mr-1">Templates :</span>
          {templatesQuery.data.filter((t) => t.gameMode === 'DRAW').map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t.id)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 cursor-pointer transition-all"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Date du tirage au sort *</label>
        <input
          type="datetime-local"
          value={sharedDrawDate ? sharedDrawDate.slice(0, 16) : ''}
          onChange={(e) => setDrawDateForAll(e.target.value)}
          className="w-full sm:w-64 bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Lots à gagner</label>
        <div className="space-y-2">
          {prizes.map((prize, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden">
                {prize.imageData ? (
                  <img src={`data:${prize.imageMimeType};base64,${prize.imageData}`} className="h-full w-full object-cover" alt="" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-slate-300" />
                )}
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(index, e)} className="hidden" />
              </label>
              <input
                type="text"
                value={prize.name}
                onChange={(e) => updatePrize(index, { name: e.target.value })}
                placeholder="Nom du lot"
                className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-900 px-3 h-9 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-400 font-bold">Gagnants</span>
                <input
                  type="number"
                  min={1}
                  value={prize.totalStock}
                  onChange={(e) => updatePrize(index, { totalStock: Math.max(1, Number(e.target.value)) })}
                  className="w-16 bg-white border border-slate-200 text-slate-900 px-2 h-9 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                />
              </div>
              <button type="button" onClick={() => deletePrize(index)} className="p-2 text-red-400 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 rounded-lg transition-all shrink-0 cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPrize}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un lot
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Message affiché après inscription</label>
        <textarea
          value={data.postSignupMessage}
          onChange={(e) => setData((p) => ({ ...p, postSignupMessage: e.target.value }))}
          placeholder="Ex: Merci pour votre participation ! Le tirage aura lieu le..."
          rows={3}
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all resize-none"
        />
      </div>
    </div>
  )
}
