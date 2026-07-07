'use client'

import { useEffect, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Plus, ImageIcon, Palette, PlayCircle, Crop } from 'lucide-react'
import { RouletteWheel } from '../RouletteWheel'
import { SEGMENT_COLOR_PALETTE, type GameConfigData, type ConfigPrize } from './types'
import { ImageCropModal } from './ImageCropModal'
import { trpc } from '@/utils/trpc'

const SEGMENT_COUNTS = [6, 8, 10, 12]

function makeSegment(order: number): ConfigPrize {
  return {
    name: `Lot ${order + 1}`,
    color: SEGMENT_COLOR_PALETTE[order % SEGMENT_COLOR_PALETTE.length],
    imageData: null,
    imageMimeType: null,
    winProbability: 0,
    totalStock: 10,
    type: 'PHYSICAL',
    fallbackPrizeId: null,
    drawDate: null,
    validityDays: 30,
    order,
  }
}

function SortableSegmentRow({
  segment,
  index,
  onChange,
  onDelete,
}: {
  segment: ConfigPrize
  index: number
  onChange: (index: number, patch: Partial<ConfigPrize>) => void
  onDelete: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `seg-${index}` })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  // Which control is shown for this segment's background — derived from
  // whether a photo is already set, but kept as local state too so picking
  // "Image" shows the upload control right away, before a file is chosen.
  const [mode, setMode] = useState<'color' | 'image'>(segment.imageData ? 'image' : 'color')
  useEffect(() => {
    if (segment.imageData) setMode('image')
  }, [segment.imageData])
  const [isCropping, setIsCropping] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset so selecting the same file again still fires a change event.
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      onChange(index, { imageData: base64, imageMimeType: file.type })
    }
    reader.readAsDataURL(file)
  }

  const selectColorMode = () => {
    setMode('color')
    onChange(index, { imageData: null, imageMimeType: null })
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
        <button
          type="button"
          onClick={selectColorMode}
          title="Couleur unie"
          aria-pressed={mode === 'color'}
          className={`h-7 w-7 rounded-md flex items-center justify-center cursor-pointer transition-all ${
            mode === 'color' ? 'bg-[#FF8C00] text-white' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setMode('image')}
          title="Image"
          aria-pressed={mode === 'image'}
          className={`h-7 w-7 rounded-md flex items-center justify-center cursor-pointer transition-all ${
            mode === 'image' ? 'bg-[#FF8C00] text-white' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {mode === 'color' ? (
        <input
          type="color"
          value={segment.color}
          onChange={(e) => onChange(index, { color: e.target.value })}
          className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer shrink-0"
          title="Couleur du segment"
        />
      ) : (
        <>
          <label className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden" title="Photo du segment">
            {segment.imageData ? (
              <img src={`data:${segment.imageMimeType};base64,${segment.imageData}`} className="h-full w-full object-cover" alt="" />
            ) : (
              <ImageIcon className="h-4 w-4 text-slate-300" />
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
          {segment.imageData && (
            <button
              type="button"
              onClick={() => setIsCropping(true)}
              title="Recadrer la photo"
              className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
            >
              <Crop className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      {isCropping && segment.imageData && (
        <ImageCropModal
          imageData={segment.imageData}
          imageMimeType={segment.imageMimeType || 'image/jpeg'}
          onCancel={() => setIsCropping(false)}
          onConfirm={({ imageData, imageMimeType }) => {
            onChange(index, { imageData, imageMimeType })
            setIsCropping(false)
          }}
        />
      )}

      <input
        type="text"
        value={segment.name}
        onChange={(e) => onChange(index, { name: e.target.value })}
        placeholder="Nom du lot"
        className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-900 px-3 h-9 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
      />

      <input
        type="number"
        min={0}
        max={100}
        value={Math.round(segment.winProbability * 100)}
        onChange={(e) => onChange(index, { winProbability: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })}
        className="w-16 bg-white border border-slate-200 text-slate-900 px-2 h-9 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
        title="Probabilité de gain (%)"
      />
      <span className="text-[10px] text-slate-400 font-bold -ml-1">%</span>

      <input
        type="number"
        value={segment.totalStock}
        onChange={(e) => onChange(index, { totalStock: Number(e.target.value) })}
        className="w-16 bg-white border border-slate-200 text-slate-900 px-2 h-9 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
        title="Stock (-1 = illimité)"
      />

      <button type="button" onClick={() => onDelete(index)} className="p-2 text-red-400 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 rounded-lg transition-all shrink-0 cursor-pointer">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface RouletteConfigEditorProps {
  data: GameConfigData
  setData: (updater: (prev: GameConfigData) => GameConfigData) => void
}

export function RouletteConfigEditor({ data, setData }: RouletteConfigEditorProps) {
  const [spinTrigger, setSpinTrigger] = useState(0)
  const templatesQuery = trpc.getCampaignTemplates.useQuery()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const segments = data.prizes
  const sum = segments.reduce((acc, s) => acc + s.winProbability, 0)
  const sumPercent = Math.round(sum * 100)
  const isValid = segments.length >= 2 && Math.abs(sum - 1) < 0.011

  const setSegmentCount = (count: number) => {
    setData((p) => {
      const current = [...p.prizes]
      if (current.length < count) {
        while (current.length < count) current.push(makeSegment(current.length))
      } else {
        current.length = count
      }
      // Répartit équitablement les probabilités si tout est encore à 0
      if (current.every((s) => s.winProbability === 0)) {
        current.forEach((s, i) => (s.winProbability = i === current.length - 1 ? 1 - (1 / count) * (count - 1) : 1 / count))
      }
      return { ...p, prizes: current.map((s, i) => ({ ...s, order: i })) }
    })
  }

  const updateSegment = (index: number, patch: Partial<ConfigPrize>) => {
    setData((p) => {
      const next = [...p.prizes]
      next[index] = { ...next[index], ...patch }
      return { ...p, prizes: next }
    })
  }

  const deleteSegment = (index: number) => {
    setData((p) => ({ ...p, prizes: p.prizes.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })) }))
  }

  const addSegment = () => {
    setData((p) => ({ ...p, prizes: [...p.prizes, makeSegment(p.prizes.length)] }))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = Number(String(active.id).replace('seg-', ''))
    const newIndex = Number(String(over.id).replace('seg-', ''))
    setData((p) => ({ ...p, prizes: arrayMove(p.prizes, oldIndex, newIndex).map((s, i) => ({ ...s, order: i })) }))
  }

  const applyTemplate = (templateId: string) => {
    const tpl = templatesQuery.data?.find((t) => t.id === templateId && t.gameMode === 'ROULETTE')
    if (!tpl || !('segments' in tpl)) return
    setData((p) => ({
      ...p,
      templateUsed: tpl.id,
      prizes: tpl.segments.map((s, i) => ({
        name: s.name,
        color: s.color,
        imageData: null,
        imageMimeType: null,
        winProbability: s.winProbability,
        totalStock: 10,
        type: 'PHYSICAL',
        fallbackPrizeId: null,
        drawDate: null,
        validityDays: 30,
        order: i,
      })),
    }))
  }

  const previewPrizes = segments.map((s, i) => ({
    id: s.id || `preview-${i}`,
    name: s.name || `Lot ${i + 1}`,
    type: s.type,
    totalStock: s.totalStock,
    remainingStock: s.totalStock,
    winProbability: s.winProbability || 0.0001,
    fallbackPrizeId: null,
    color: s.color,
    imageData: s.imageData,
    imageMimeType: s.imageMimeType,
  }))

  return (
    <div className="space-y-6">
      {/* Templates préconfigurés */}
      {templatesQuery.data && templatesQuery.data.some((t) => t.gameMode === 'ROULETTE') && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-400 self-center mr-1">Templates :</span>
          {templatesQuery.data.filter((t) => t.gameMode === 'ROULETTE').map((t) => (
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

      {/* Nombre de segments */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nombre de segments</label>
        <div className="flex gap-2">
          {SEGMENT_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setSegmentCount(count)}
              className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                segments.length === count ? 'bg-[#FF8C00] border-[#FF8C00] text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Limite de lancers par client */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Lancers offerts par client</label>
        <input
          type="number"
          min={1}
          max={20}
          value={data.spinsPerClient}
          onChange={(e) => setData((p) => ({ ...p, spinsPerClient: Math.max(1, Number(e.target.value)) }))}
          className="w-24 bg-slate-50 border border-slate-200 text-slate-900 px-3 h-10 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Éditeur de segments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Segments</label>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${isValid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              Total : {sumPercent}% {isValid ? '✓' : '(doit faire 100%)'}
            </span>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={segments.map((_, i) => `seg-${i}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {segments.map((segment, index) => (
                  <SortableSegmentRow key={index} segment={segment} index={index} onChange={updateSegment} onDelete={deleteSegment} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addSegment}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un segment
          </button>
        </div>

        {/* Aperçu live */}
        <div className="flex flex-col items-center">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 self-start">Aperçu live</label>
          {segments.length >= 2 ? (
            <>
              <RouletteWheel
                campaignId="preview"
                prizes={previewPrizes as any}
                email="preview@local"
                previewMode
                spinTrigger={spinTrigger}
                onSpinSuccess={() => {}}
              />
              <button
                type="button"
                onClick={() => setSpinTrigger((v) => v + 1)}
                className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <PlayCircle className="h-4 w-4" /> Tester
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-400 font-semibold py-12">Ajoutez au moins 2 segments pour voir l'aperçu.</p>
          )}
        </div>
      </div>
    </div>
  )
}
