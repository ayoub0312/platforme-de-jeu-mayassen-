'use client'

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Power, Trash2 } from 'lucide-react'

interface Banner {
  id: string
  imageData: string
  imageMimeType: string
  isActive: boolean
}

interface SortableBannerRowProps {
  banner: Banner
  index: number
  onToggleActive: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}

function SortableBannerRow({ banner, index, onToggleActive, onDelete }: SortableBannerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-surface-alt border border-black/[0.06] rounded-xl">
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-ink-500/50 hover:text-ink-700 shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="h-12 w-20 shrink-0 rounded-lg overflow-hidden border border-black/[0.06]">
        <img src={`data:${banner.imageMimeType};base64,${banner.imageData}`} alt="Bannière" className="h-full w-full object-cover" />
      </div>
      <span className="flex-1 min-w-0 text-xs text-ink-500 font-semibold">Bannière #{index + 1}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onToggleActive(banner.id, banner.isActive)}
          title={banner.isActive ? 'Désactiver' : 'Activer'}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            banner.isActive ? 'bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]' : 'bg-black/[0.04] border-black/[0.06] text-ink-500'
          }`}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(banner.id)}
          className="p-1.5 text-[var(--danger)] hover:text-white hover:bg-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg transition-all cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export interface SortableBannerListProps {
  banners: Banner[]
  onReorder: (orderedIds: string[]) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}

export function SortableBannerList({ banners, onReorder, onToggleActive, onDelete }: SortableBannerListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = banners.findIndex((b) => b.id === active.id)
    const newIndex = banners.findIndex((b) => b.id === over.id)
    onReorder(arrayMove(banners, oldIndex, newIndex).map((b) => b.id))
  }

  if (banners.length === 0) {
    return <div className="text-center py-8 text-xs text-ink-500 font-semibold">Aucune bannière pour le moment.</div>
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {banners.map((banner, i) => (
            <SortableBannerRow key={banner.id} banner={banner} index={i} onToggleActive={onToggleActive} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
