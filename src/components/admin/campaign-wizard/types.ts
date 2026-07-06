export interface WizardInfoState {
  title: string
  description: string
  category: string
  partnerId: string
  startDate: string // datetime-local string
  endDate: string
  imageData: string | null
  imageMimeType: string | null
}

export const EMPTY_WIZARD_INFO: WizardInfoState = {
  title: '',
  description: '',
  category: '',
  partnerId: '',
  startDate: '',
  endDate: '',
  imageData: null,
  imageMimeType: null,
}

export const CAMPAIGN_CATEGORIES = [
  'Voyages & Circuits',
  'Hôtels & Séjours',
  'Omra',
  'Bons de Réduction',
  'Autres Cadeaux',
]
