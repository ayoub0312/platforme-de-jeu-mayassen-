import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyCustomerSessionToken } from '@/lib/auth'
import { ClientShell } from '@/components/client/ClientShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Espace client | Obooking Gift',
  robots: { index: false, follow: false },
}

export default async function ClientAppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('customer_session')?.value
  const session = await verifyCustomerSessionToken(token)

  if (!session) {
    redirect('/client/login')
  }

  return <ClientShell>{children}</ClientShell>
}
