'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { RouletteConfigEditor } from '../../campaign-config/RouletteConfigEditor'
import { DrawConfigEditor } from '../../campaign-config/DrawConfigEditor'
import type { GameConfigData } from '../../campaign-config/types'
import { StepInfo } from './StepInfo'
import { StepGameType } from './StepGameType'
import { StepPrizesFallback } from './StepPrizesFallback'
import { StepRecap } from './StepRecap'
import { EMPTY_WIZARD_INFO } from './types'

const STEP_LABELS = ['Infos', 'Type de jeu', 'Configuration', 'Lots & repli', 'Récapitulatif']

const EMPTY_GAME_DATA: GameConfigData = {
  campaignId: '',
  gameMode: 'ROULETTE',
  templateUsed: null,
  spinsPerClient: 1,
  postSignupMessage: '',
  prizes: [],
}

export interface CampaignWizardProps {
  open: boolean
  onClose: () => void
  partners: { id: string; name: string }[]
}

export function CampaignWizard({ open, onClose, partners }: CampaignWizardProps) {
  const toast = useToast()
  const utils = trpc.useUtils()

  const [step, setStep] = useState(0)
  const [maxStepReached, setMaxStepReached] = useState(0)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [info, setInfo] = useState(EMPTY_WIZARD_INFO)
  const [gameData, setGameData] = useState<GameConfigData>(EMPTY_GAME_DATA)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCampaignMut = trpc.createCampaign.useMutation()
  const updateCampaignMut = trpc.updateCampaign.useMutation()
  const setGameModeMut = trpc.setCampaignGameMode.useMutation()
  const updateGameConfigMut = trpc.updateCampaignGameConfig.useMutation()
  const upsertPrizesMut = trpc.upsertPrizesForCampaign.useMutation()

  const resetState = () => {
    setStep(0)
    setMaxStepReached(0)
    setCampaignId(null)
    setInfo(EMPTY_WIZARD_INFO)
    setGameData(EMPTY_GAME_DATA)
    setError(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const persistPrizes = async (id: string) => {
    const saved = await upsertPrizesMut.mutateAsync({
      campaignId: id,
      prizes: gameData.prizes.map((p) => ({
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
    setGameData((g) => ({
      ...g,
      prizes: saved.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color || '#F58220',
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
    }))
  }

  const goNext = async () => {
    setError(null)

    if (step === 0) {
      if (!info.title.trim()) return setError('Le titre est obligatoire.')
      if (!info.startDate || !info.endDate) return setError('Les dates de début et de fin sont obligatoires.')
      if (new Date(info.endDate) <= new Date(info.startDate)) return setError('La date de fin doit être après la date de début.')
    }
    if (step === 2) {
      if (gameData.gameMode === 'ROULETTE') {
        const sum = gameData.prizes.reduce((acc, p) => acc + p.winProbability, 0)
        if (gameData.prizes.length < 2) return setError('Ajoutez au moins 2 segments.')
        if (Math.abs(sum - 1) > 0.011) return setError(`La somme des probabilités doit être 100% (actuellement ${Math.round(sum * 100)}%).`)
      } else {
        if (gameData.prizes.length === 0) return setError('Ajoutez au moins un lot.')
        if (!gameData.prizes[0]?.drawDate) return setError('Renseignez la date du tirage.')
      }
    }

    setSaving(true)
    try {
      if (step === 0) {
        const payload = {
          title: info.title,
          description: info.description || null,
          category: info.category || null,
          partnerId: info.partnerId || null,
          startDate: new Date(info.startDate),
          endDate: new Date(info.endDate),
          isActive: true,
          gameMode: gameData.gameMode,
          imageData: info.imageData,
          imageMimeType: info.imageMimeType,
        }
        if (campaignId) {
          await updateCampaignMut.mutateAsync({ id: campaignId, ...payload })
        } else {
          const created = await createCampaignMut.mutateAsync({ ...payload, isDraft: true })
          setCampaignId(created.id)
          setGameData((g) => ({ ...g, campaignId: created.id }))
        }
      } else if (step === 1 && campaignId) {
        await setGameModeMut.mutateAsync({ id: campaignId, gameMode: gameData.gameMode })
      } else if (step === 2 && campaignId) {
        await updateGameConfigMut.mutateAsync({
          id: campaignId,
          spinsPerClient: gameData.spinsPerClient,
          postSignupMessage: gameData.postSignupMessage || null,
        })
        await persistPrizes(campaignId)
      } else if (step === 3 && campaignId) {
        await persistPrizes(campaignId)
      }
      toast.success('Étape enregistrée en brouillon.')
      setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1))
      setMaxStepReached((m) => Math.max(m, step + 1))
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!campaignId) return
    setSaving(true)
    setError(null)
    try {
      await updateCampaignMut.mutateAsync({
        id: campaignId,
        title: info.title,
        description: info.description || null,
        category: info.category || null,
        partnerId: info.partnerId || null,
        startDate: new Date(info.startDate),
        endDate: new Date(info.endDate),
        isActive: true,
        isDraft: false,
        gameMode: gameData.gameMode,
        imageData: info.imageData,
        imageMimeType: info.imageMimeType,
      })
      await utils.getAllCampaigns.invalidate()
      await utils.getAllPrizes.invalidate()
      toast.success('Campagne publiée avec succès !')
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la publication.')
    } finally {
      setSaving(false)
    }
  }

  const partnerName = partners.find((p) => p.id === info.partnerId)?.name || 'Obooking (campagne système)'

  return (
    <Modal open={open} onClose={handleClose} title="Nouvelle campagne" maxWidthClassName="max-w-3xl">
      {/* Progress bar */}
      <div className="flex items-center mb-6">
        {STEP_LABELS.map((label, i) => {
          const isDone = i < step
          const isCurrent = i === step
          const isClickable = i <= maxStepReached
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setStep(i)}
                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                  isDone || isCurrent ? 'bg-gradient-brand-signature text-white' : 'bg-surface-alt text-ink-500'
                } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                title={label}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1.5 rounded-full ${isDone ? 'bg-brand-500' : 'bg-black/[0.08]'}`} />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-center text-xs font-bold text-ink-500 uppercase tracking-wide mb-6">
        Étape {step + 1}/{STEP_LABELS.length} — {STEP_LABELS[step]}
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-[var(--radius-ds-sm)] text-xs font-bold text-[var(--danger)]">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && <StepInfo info={info} setInfo={setInfo} partners={partners} />}
          {step === 1 && <StepGameType gameMode={gameData.gameMode} onChange={(mode) => setGameData((g) => ({ ...g, gameMode: mode }))} />}
          {step === 2 && (
            gameData.gameMode === 'ROULETTE'
              ? <RouletteConfigEditor data={gameData} setData={setGameData} />
              : <DrawConfigEditor data={gameData} setData={setGameData} />
          )}
          {step === 3 && <StepPrizesFallback prizes={gameData.prizes} setPrizes={(updater) => setGameData((g) => ({ ...g, prizes: updater(g.prizes) }))} />}
          {step === 4 && <StepRecap info={info} gameMode={gameData.gameMode} prizes={gameData.prizes} partnerName={partnerName} />}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-black/[0.06]">
        <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>

        {step < STEP_LABELS.length - 1 ? (
          <Button size="sm" onClick={goNext} loading={saving}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={handlePublish} loading={saving}>
            {!saving && <Rocket className="h-4 w-4" />} Publier la campagne
          </Button>
        )}
      </div>
    </Modal>
  )
}
