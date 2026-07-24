import { prisma } from '@/lib/db'
import { checkApiSecret, json } from '@/lib/loyalty-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/loyalty/purchase
// Appelé par obooking.tn après un paiement réussi. Enregistre l'achat, calcule
// et crédite les points merci (si le client a déjà un compte ; sinon l'achat
// reste en attente et sera crédité à la création du compte). Idempotent sur
// `orderRef`.
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

  const orderRef = typeof body.orderRef === 'string' ? body.orderRef.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const amountTnd = Number(body.amountTnd)
  const description = typeof body.description === 'string' ? body.description.trim() : null
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : null
  const purchasedAt = body.purchasedAt ? new Date(body.purchasedAt) : new Date()

  if (!orderRef) return json({ error: 'bad_request', message: 'orderRef requis.' }, 400)
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'bad_request', message: 'email valide requis.' }, 400)
  }
  if (!Number.isFinite(amountTnd) || amountTnd < 0) {
    return json({ error: 'bad_request', message: 'amountTnd doit être un nombre positif.' }, 400)
  }
  if (isNaN(purchasedAt.getTime())) {
    return json({ error: 'bad_request', message: 'purchasedAt doit être une date ISO valide.' }, 400)
  }

  const baseUrl = (process.env.APP_BASE_URL || new URL(req.url).origin).replace(/\/$/, '')
  const signupUrl = `${baseUrl}/client/signup?email=${encodeURIComponent(email)}`

  // Idempotence : si l'achat existe déjà, on renvoie son état sans le recréer.
  const existing = await prisma.loyaltyPurchase.findUnique({ where: { orderRef } })
  if (existing) {
    return json({
      orderRef: existing.orderRef,
      pointsEarned: existing.pointsEarned,
      status: existing.status,
      customerExists: !!existing.customerId,
      alreadyProcessed: true,
      signupUrl,
    })
  }

  // Barème de gain + activation, depuis la config globale.
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'main' },
    select: { loyaltyEnabled: true, pointsPerTnd: true },
  })
  const enabled = settings?.loyaltyEnabled ?? false
  const pointsPerTnd = settings?.pointsPerTnd ?? 1
  const pointsEarned = enabled ? Math.floor(amountTnd * pointsPerTnd) : 0

  const customer = await prisma.customer.findUnique({ where: { email }, select: { id: true } })

  if (customer) {
    // Compte existant → on crédite immédiatement (transaction atomique).
    const purchase = await prisma.$transaction(
      async (tx) => {
        const created = await tx.loyaltyPurchase.create({
          data: {
            orderRef,
            email,
            customerId: customer.id,
            amountTnd,
            pointsEarned,
            status: 'CREDITED',
            description,
            purchasedAt,
            creditedAt: new Date(),
          },
        })
        if (pointsEarned > 0) {
          const c = await tx.customer.findUnique({ where: { id: customer.id }, select: { points: true } })
          const newBalance = (c?.points ?? 0) + pointsEarned
          await tx.customer.update({ where: { id: customer.id }, data: { points: newBalance } })
          await tx.pointTransaction.create({
            data: {
              customerId: customer.id,
              delta: pointsEarned,
              type: 'EARN_PURCHASE',
              reason: `Achat ${orderRef}`,
              balanceAfter: newBalance,
              purchaseId: created.id,
            },
          })
        }
        return created
      },
      { timeout: 20000, maxWait: 10000 }
    )

    return json({
      orderRef: purchase.orderRef,
      pointsEarned: purchase.pointsEarned,
      status: purchase.status,
      customerExists: true,
      signupUrl,
    }, 201)
  }

  // Pas de compte → achat en attente, crédité à la création du compte (même email).
  await prisma.loyaltyPurchase.create({
    data: { orderRef, email, amountTnd, pointsEarned, status: 'PENDING', description, purchasedAt },
  })
  void customerName // réservé pour un pré-remplissage éventuel du compte

  return json({
    orderRef,
    pointsEarned,
    status: 'PENDING',
    customerExists: false,
    signupUrl,
  }, 201)
}
