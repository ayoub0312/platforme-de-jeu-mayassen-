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

export const SEGMENT_COLOR_PALETTE = ['#FF6B47', '#182444', '#E8A33D', '#E8E6E1', '#C23F1F', '#0EA5A0']
