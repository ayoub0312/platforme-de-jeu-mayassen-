'use client'

import { ImageIcon, Upload } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { CAMPAIGN_CATEGORIES, type WizardInfoState } from './types'

interface StepInfoProps {
  info: WizardInfoState
  setInfo: (updater: (prev: WizardInfoState) => WizardInfoState) => void
  partners: { id: string; name: string }[]
}

export function StepInfo({ info, setInfo, partners }: StepInfoProps) {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image (JPEG, PNG, WEBP...).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Le fichier dépasse la limite de 2 Mo.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      setInfo((p) => ({ ...p, imageData: base64, imageMimeType: file.type }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5">
      <Input
        label="Titre de la campagne *"
        placeholder="Ex: Grand Jeu d'Été Boulangerie"
        value={info.title}
        onChange={(e) => setInfo((p) => ({ ...p, title: e.target.value }))}
      />

      <Textarea
        label="Description"
        placeholder="Ex: Tentez de gagner un séjour de rêve en participant à notre roulette..."
        rows={3}
        value={info.description}
        onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Catégorie"
          value={info.category}
          onChange={(e) => setInfo((p) => ({ ...p, category: e.target.value }))}
        >
          <option value="">Non catégorisé</option>
          {CAMPAIGN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>

        <Select
          label="Partenaire B2B"
          value={info.partnerId}
          onChange={(e) => setInfo((p) => ({ ...p, partnerId: e.target.value }))}
        >
          <option value="">Aucun — Campagne système générale</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="datetime-local"
          label="Date de début *"
          value={info.startDate}
          onChange={(e) => setInfo((p) => ({ ...p, startDate: e.target.value }))}
        />
        <Input
          type="datetime-local"
          label="Date de fin *"
          value={info.endDate}
          onChange={(e) => setInfo((p) => ({ ...p, endDate: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-ink-700 mb-1.5">Image de couverture</label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 rounded-[var(--radius-ds-sm)] border border-black/[0.08] bg-surface-alt flex items-center justify-center overflow-hidden">
            {info.imageData ? (
              <img src={`data:${info.imageMimeType || 'image/jpeg'};base64,${info.imageData}`} alt="Aperçu" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-ink-500/40" />
            )}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-alt hover:bg-brand-50 border border-black/[0.08] rounded-lg text-xs font-bold text-ink-700 cursor-pointer transition-colors">
              <Upload className="h-3.5 w-3.5" />
              Importer une image
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            {info.imageData && (
              <button
                type="button"
                onClick={() => setInfo((p) => ({ ...p, imageData: null, imageMimeType: null }))}
                className="px-3 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 border border-[var(--danger)]/20 rounded-lg text-xs font-bold text-[var(--danger)] transition-colors cursor-pointer"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-ink-500 mt-2 font-semibold">JPEG, PNG ou WEBP, 2 Mo max.</p>
      </div>
    </div>
  )
}
