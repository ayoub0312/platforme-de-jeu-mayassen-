// Bandeau explicite, visible et non masquable — ces pages consomment
// ObookingDataSource (src/lib/obookingDataSource.ts), actuellement
// MockObookingDataSource (données factices). Voir ESPACE_CLIENT.md.
export function DemoBanner() {
  return (
    <div className="border border-amber-300 bg-amber-50 text-amber-900 rounded-md px-4 py-3 text-xs font-medium mb-8">
      Données de démonstration — intégration obooking.tn en attente.
    </div>
  )
}
