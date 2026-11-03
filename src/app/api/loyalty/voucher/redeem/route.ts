import { prisma } from '@/lib/db'
import { checkApiSecret, json } from '@/lib/loyalty-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/loyalty/voucher/redeem
// obooking.tn marque un bon comme UTILISÉ après avoir appliqué la réduction au
// paiement. Idempotent : réappeler avec le même code renvoie l'état "déjà
// utilisé" sans erreur.
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
  const orderRef = typeof body.orderRef === 'string' ? body.orderRef.trim() : null
  if (!code) return json({ error: 'bad_request', message: 'code requis.' }, 400)

  const voucher = await prisma.loyaltyVoucher.findUnique({ where: { code } })
  if (!voucher) {
    return json({ redeemed: false, reason: 'not_found', message: 'Code inconnu.' }, 404)
  }

  // Déjà utilisé → idempotent.
  if (voucher.status === 'REDEEMED') {
    return json({
      redeemed: true,
      alreadyRedeemed: true,
      code: voucher.code,
      valueTnd: voucher.valueTnd,
      redeemedAt: voucher.redeemedAt ? voucher.redeemedAt.toISOString() : null,
    })
  }

  const expired = !!voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()
  if (voucher.status === 'EXPIRED' || expired) {
    return json({ redeemed: false, reason: 'expired', message: 'Bon expiré.', code }, 409)
  }

  // Mise à jour conditionnelle : deux appels simultanés ne peuvent pas tous
  // les deux faire passer le bon de ACTIVE à REDEEMED (un seul bon = une seule
  // réduction).
  const now = new Date()
  const { count } = await prisma.loyaltyVoucher.updateMany({
    where: {
      code,
      status: voucher.status,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: { status: 'REDEEMED', redeemedAt: now },
  })

  void orderRef // conservé pour traçabilité éventuelle côté obooking.tn

  if (count === 0) {
    const current = await prisma.loyaltyVoucher.findUnique({ where: { code } })
    if (current?.status === 'REDEEMED') {
      return json({
        redeemed: true,
        alreadyRedeemed: true,
        code: current.code,
        valueTnd: current.valueTnd,
        redeemedAt: current.redeemedAt ? current.redeemedAt.toISOString() : null,
      })
    }
    return json({ redeemed: false, reason: 'expired', message: 'Bon expiré.', code }, 409)
  }

  return json({
    redeemed: true,
    code: voucher.code,
    valueTnd: voucher.valueTnd,
    redeemedAt: now.toISOString(),
  })
}
