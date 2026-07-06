'use client'

import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

export interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} maxWidthClassName="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-brand-50 text-brand-600'}`}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
        <p className="text-ink-500 text-sm mt-2 leading-relaxed">{description}</p>

        <div className="flex items-center gap-3 mt-6 w-full">
          <Button variant="secondary" size="sm" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
