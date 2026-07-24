import { prisma } from '@/lib/db'
import { checkApiSecret, json } from '@/lib/loyalty-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/loyalty/voucher/validate
// obooking.tn vérifie un code de bon au moment du paiement. NE consomme PAS le
// bon (lecture seule) — utiliser /redeem pour le marquer comme utilisé.
export async function POST(req: Request) {
  if (!checkApiSecret(req)) {
    return json({ error: 'unauthorized', message: 'Secret API invalide ou manquant.' }, 401)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request', message: 'Corps JSON invalide.' }, 400)
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!code) return json({ error: 'bad_request', message: 'code requis.' }, 400)

  const voucher = await prisma.loyaltyVoucher.findUnique({ where: { code } })
  if (!voucher) {
    return json({ valid: false, reason: 'not_found', message: 'Code inconnu.' })
  }

  const expired = !!voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()
  if (voucher.status === 'REDEEMED') {
    return json({ valid: false, reason: 'already_redeemed', message: 'Bon déjà utilisé.', code })
  }
  if (voucher.status === 'EXPIRED' || expired) {
    return json({ valid: false, reason: 'expired', message: 'Bon expiré.', code })
  }

  return json({
    valid: true,
    code: voucher.code,
    valueTnd: voucher.valueTnd,
    status: voucher.status,
    expiresAt: voucher.expiresAt ? voucher.expiresAt.toISOString() : null,
  })
}
