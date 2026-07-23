import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyCustomerSessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Route pratique /compte = ESPACE CLIENT. Toujours dirigée vers l'espace client
// (jamais le back-office admin, même si un admin_session est présent) : c'est le
// point d'entrée du compte client. Connecté → profil ; sinon → connexion client.
export default async function ComptePage() {
  const cookieStore = await cookies()

  const customerSession = await verifyCustomerSessionToken(cookieStore.get('customer_session')?.value)
  if (customerSession) {
    redirect('/client/mes-informations')
  }

  // Pas de session client → page de connexion client.
  redirect('/client/login')
}
