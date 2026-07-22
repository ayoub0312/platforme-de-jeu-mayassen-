// Endpoint de diagnostic TEMPORAIRE — révèle (masqué) la config DB en prod pour
// pister l'erreur "Invalid URL". N'expose aucun secret : seulement le début de
// l'URL (public) et les longueurs. À SUPPRIMER une fois le problème résolu.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const rawUrl = (process.env.TURSO_DATABASE_URL ?? '').trim()
  const rawToken = (process.env.TURSO_AUTH_TOKEN ?? '').trim()

  let urlScheme = 'VIDE'
  if (rawUrl) {
    try {
      urlScheme = new URL(rawUrl).protocol
    } catch {
      urlScheme = 'INVALIDE (pas une URL)'
    }
  }

  const info: Record<string, unknown> = {
    isVercel: !!process.env.VERCEL,
    hasUrl: !!process.env.TURSO_DATABASE_URL,
    hasToken: !!process.env.TURSO_AUTH_TOKEN,
    urlLength: rawUrl.length,
    urlStart: rawUrl.slice(0, 18),
    urlScheme,
    tokenLength: rawToken.length,
    tokenStart: rawToken.slice(0, 6),
  }

  // Test réel de connexion à la base.
  try {
    const { prisma } = await import('@/lib/db')
    const count = await prisma.campaign.count()
    info.dbTest = `OK — connexion reussie (${count} campagnes)`
  } catch (e) {
    info.dbTest = `ERREUR — ${((e as Error)?.message || String(e)).slice(0, 300)}`
  }

  return Response.json(info, { headers: { 'Cache-Control': 'no-store' } })
}
