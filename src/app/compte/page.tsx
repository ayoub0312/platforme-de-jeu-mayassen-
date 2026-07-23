import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionToken, verifyCustomerSessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Route pratique /compte : redirige vers l'espace compte adapté à la personne
// connectée (admin/partenaire → back-office ; client → profil). Non connecté →
// page de connexion client.
export default async function ComptePage() {
  const cookieStore = await cookies()

  const adminSession = await verifySessionToken(cookieStore.get('admin_session')?.value)
  if (adminSession) {
    // Admin / partenaire : ses réglages de compte sont dans Paramètres.
    redirect('/partner')
  }

  const customerSession = await verifyCustomerSessionToken(cookieStore.get('customer_session')?.value)
  if (customerSession) {
    redirect('/client/mes-informations')
  }

  // Personne de connecté → connexion client.
  redirect('/client/login')
}
