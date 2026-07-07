'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropModalProps {
  imageData: string
  imageMimeType: string
  onCancel: () => void
  onConfirm: (result: { imageData: string; imageMimeType: string }) => void
}

// Fixed square viewport the admin drags/zooms the photo within, and fixed
// output resolution the crop gets rendered to — matches the roughly-square
// bounding box each wheel segment uses, so what's framed here is what shows.
const VIEWPORT = 280
const OUTPUT = 480

export function ImageCropModal({ imageData, imageMimeType, onCancel, onConfirm }: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)

  const src = `data:${imageMimeType || 'image/jpeg'};base64,${imageData}`

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = src
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const baseScale = naturalSize ? Math.max(VIEWPORT / naturalSize.w, VIEWPORT / naturalSize.h) : 1
  const effectiveScale = baseScale * zoom
  const displayW = naturalSize ? naturalSize.w * effectiveScale : VIEWPORT
  const displayH = naturalSize ? naturalSize.h * effectiveScale : VIEWPORT

  const clampPan = (x: number, y: number) => {
    const minX = Math.min(0, VIEWPORT - displayW)
    const minY = Math.min(0, VIEWPORT - displayH)
    return { x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) }
  }

  useEffect(() => {
    setPan((p) => clampPan(p.x, p.y))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, naturalSize])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y }
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan(clampPan(dragRef.current.startPanX + dx, dragRef.current.startPanY + dy))
  }
  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleConfirm = () => {
    if (!naturalSize || !imgRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const sourceX = -pan.x / effectiveScale
    const sourceY = -pan.y / effectiveScale
    const sourceSize = VIEWPORT / effectiveScale
    ctx.drawImage(imgRef.current, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    onConfirm({ imageData: dataUrl.split(',')[1] || '', imageMimeType: 'image/jpeg' })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-black text-sm text-slate-800">Recadrer la photo</h4>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-450 mb-3">Faites glisser la photo pour la repositionner, et utilisez le curseur pour zoomer.</p>

        <div
          className="relative mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            className="absolute pointer-events-none max-w-none"
            style={{ width: displayW, height: displayH, transform: `translate(${pan.x}px, ${pan.y}px)` }}
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <ZoomOut className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[#FF8C00]"
            aria-label="Zoom"
          />
          <ZoomIn className="h-4 w-4 text-slate-400 shrink-0" />
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#FF8C00] hover:bg-[#E07B00] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}
