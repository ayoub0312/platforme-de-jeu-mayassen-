import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyCustomerSessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ClientRootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('customer_session')?.value
  const session = await verifyCustomerSessionToken(token)
  redirect(session ? '/client/mes-informations' : '/client/login')
}
