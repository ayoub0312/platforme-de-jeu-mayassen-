'use client'

import { useState } from 'react'
import { Download, Share2, Check } from 'lucide-react'

interface VoucherActionsProps {
  prizeName: string
  partnerName: string
  winnerName: string
  confirmationCode: string
  wonDate: string
  qrDataUrl: string
  voucherUrl: string
}

export function VoucherActions({ prizeName, partnerName, winnerName, confirmationCode, wonDate, qrDataUrl, voucherUrl }: VoucherActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleDownloadPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: [100, 150] })

    doc.setFillColor(245, 130, 32)
    doc.rect(0, 0, 100, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text("Bon d'Achat", 50, 14, { align: 'center' })
    doc.setFontSize(14)
    doc.text(prizeName, 50, 24, { align: 'center', maxWidth: 88 })

    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    let y = 45
    doc.text(`Gagnant : ${winnerName}`, 10, y)
    y += 7
    doc.text(`Gagné le : ${wonDate}`, 10, y)
    y += 7
    doc.text(`Offert par : ${partnerName}`, 10, y)
    y += 10

    doc.addImage(qrDataUrl, 'PNG', 25, y, 50, 50)
    y += 56

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(confirmationCode, 50, y, { align: 'center' })
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('À présenter en agence lors de la remise du lot.', 50, y, { align: 'center', maxWidth: 88 })

    doc.save(`bon-${confirmationCode}.pdf`)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Mon bon d'achat — ${prizeName}`, url: voucherUrl })
      } catch {
        // User cancelled the native share sheet — no error needed.
      }
      return
    }
    await navigator.clipboard.writeText(voucherUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 mt-6">
      <button
        type="button"
        onClick={handleDownloadPdf}
        className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-full bg-surface border border-rule-strong text-ink-900 hover:bg-paper-2 text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" /> PDF
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-full bg-surface border border-rule-strong text-ink-900 hover:bg-paper-2 text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Share2 className="h-3.5 w-3.5" />}
        {copied ? 'Lien copié !' : 'Partager'}
      </button>
    </div>
  )
}
