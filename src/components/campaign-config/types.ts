export interface ConfigPrize {
  id?: string
  name: string
  color: string
  imageData: string | null
  imageMimeType: string | null
  winProbability: number // 0..1
  totalStock: number // -1 = illimité
  type: 'PHYSICAL' | 'DIGITAL'
  fallbackPrizeId: string | null // Lot de consolation attribué si celui-ci est épuisé
  drawDate: string | null // ISO date, tirage uniquement
  validityDays: number
  order: number
}

export interface GameConfigData {
  campaignId: string
  gameMode: 'ROULETTE' | 'DRAW'
  templateUsed: string | null
  spinsPerClient: number
  postSignupMessage: string
  prizes: ConfigPrize[]
}

export const SEGMENT_COLOR_PALETTE = ['#F97316', '#0B1120', '#D4AF6A', '#E2E8F0', '#C2410C', '#1E293B']
