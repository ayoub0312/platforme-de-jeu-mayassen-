// Couche d'abstraction pour les données appartenant au site principal
// obooking.tn (achats, points de fidélité) — CES DONNÉES N'EXISTENT PAS DANS
// CETTE BASE. Aucune table Purchase/LoyaltyPoint n'a été créée : le mode
// d'intégration réel (API, webhook, base partagée, import) reste à décider
// avec le superviseur (voir ESPACE_CLIENT.md, section "Couche d'abstraction
// obooking.tn"). Les pages "Mes achats"/"Mon activité"/"Mes points" ne
// doivent jamais dépendre de MockObookingDataSource directement — uniquement
// de l'interface ObookingDataSource ci-dessous, via l'instance exportée en
// bas de ce fichier. Remplacer l'implémentation le jour venu ne demandera de
// toucher qu'ici.

export interface ObookingPurchase {
  id: string
  label: string
  amount: number
  currency: string
  purchasedAt: string // ISO date
}

export interface ObookingLoyaltyPoints {
  balance: number
  updatedAt: string // ISO date
}

export interface ObookingDataSource {
  getPurchases(customerId: string): Promise<ObookingPurchase[]>
  getLoyaltyPoints(customerId: string): Promise<ObookingLoyaltyPoints>
}

// Implémentation BOUCHON — données entièrement factices, à but de démonstration
// uniquement. Ne lit ni n'écrit rien en base. Le customerId n'est même pas
// utilisé pour varier les données : c'est volontaire, pour qu'il soit
// impossible de la confondre avec une vraie intégration même par accident.
export class MockObookingDataSource implements ObookingDataSource {
  async getPurchases(_customerId: string): Promise<ObookingPurchase[]> {
    return [
      { id: 'mock-1', label: '[DÉMO] Séjour Hammamet 4 nuits', amount: 890, currency: 'TND', purchasedAt: '2026-05-12T10:00:00.000Z' },
      { id: 'mock-2', label: '[DÉMO] Vol Tunis → Djerba', amount: 210, currency: 'TND', purchasedAt: '2026-03-02T10:00:00.000Z' },
    ]
  }

  async getLoyaltyPoints(_customerId: string): Promise<ObookingLoyaltyPoints> {
    return { balance: 240, updatedAt: '2026-05-12T10:00:00.000Z' }
  }
}

// Point d'injection unique — le jour où l'intégration réelle est décidée,
// remplacer cette ligne par la vraie implémentation (ex: `new ApiObookingDataSource(...)`),
// sans toucher aux procédures tRPC ni aux pages qui consomment l'interface.
export const obookingDataSource: ObookingDataSource = new MockObookingDataSource()
