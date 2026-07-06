'use client'

import { usePathname } from 'next/navigation'
import { WaveBackground } from './WaveBackground'
import { FlightLine } from './FlightLine'

// Mounted once in the root layout so the wave background + flight line are
// present on every public route (/, /company/[id], /voucher/[id]...).
// Explicitly excluded on /partner: the back-office is data-table-heavy with
// no opaque background of its own, so the blobs would show through behind
// rows of tabular data — kept deliberately plain there, consistent with the
// rest of the admin (Geist Sans, no premium styling).
export function GlobalBackgroundLayer() {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/partner')

  if (isAdminRoute) return null

  return (
    <>
      <WaveBackground />
      <FlightLine fixed dim className="top-24 z-[1]" />
    </>
  )
}
