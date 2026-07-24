import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'

// ── Authentification des appels serveur→serveur d'obooking.tn ────────────────
// Le secret partagé (SHARED_API_SECRET) est comparé en temps constant. On
// accepte l'en-tête `x-api-secret: <secret>` ou `Authorization: Bearer <secret>`.
export function checkApiSecret(req: Request): boolean {
  const expected = process.env.SHARED_API_SECRET
  if (!expected || expected.trim() === '') return false

  const headerSecret =
    req.headers.get('x-api-secret') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
    ''

  const a = Buffer.from(headerSecret)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// Réponse JSON standardisée.
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

// Crédite les achats en attente (PENDING) rattachés à cet email au moment où le
// client crée son compte. Appelé depuis la création de compte client.
export async function creditPendingPurchases(customerId: string, email: string): Promise<void> {
  const pending = await prisma.loyaltyPurchase.findMany({
    where: { email: email.trim().toLowerCase(), status: 'PENDING', customerId: null },
  })
  if (pending.length === 0) return

  for (const p of pending) {
    await prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { points: true } })
        if (!customer) return
        const newBalance = customer.points + p.pointsEarned
        await tx.loyaltyPurchase.update({
          where: { id: p.id },
          data: { customerId, status: 'CREDITED', creditedAt: new Date() },
        })
        await tx.customer.update({ where: { id: customerId }, data: { points: newBalance } })
        if (p.pointsEarned > 0) {
          await tx.pointTransaction.create({
            data: {
              customerId,
              delta: p.pointsEarned,
              type: 'EARN_PURCHASE',
              reason: `Achat ${p.orderRef}`,
              balanceAfter: newBalance,
              purchaseId: p.id,
            },
          })
        }
      },
      { timeout: 20000, maxWait: 10000 }
    )
  }
}
