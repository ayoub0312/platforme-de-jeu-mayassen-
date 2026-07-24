import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Sert la vidéo hero (stockée en base64 dans SiteSettings) via une URL dédiée,
// avec cache navigateur. Évite d'inliner ~22 Mo de base64 dans le HTML de la
// page d'accueil et de les retirer des requêtes tRPC/serveur → chargement
// massivement plus rapide. Supporte les requêtes Range (streaming vidéo).
export async function GET(req: Request) {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'main' },
    select: { heroVideoData: true, heroVideoMimeType: true },
  })
  if (!settings?.heroVideoData) {
    return new Response(null, { status: 404 })
  }

  const buffer = Buffer.from(settings.heroVideoData, 'base64')
  const total = buffer.length
  const contentType = settings.heroVideoMimeType || 'video/mp4'
  const cache = 'public, max-age=3600, stale-while-revalidate=86400'

  // Requêtes Range → réponse 206 partielle (lecture/streaming vidéo fluide).
  const range = req.headers.get('range')
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range)
    if (match) {
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : total - 1
      const chunk = buffer.subarray(start, end + 1)
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunk.length),
          'Cache-Control': cache,
        },
      })
    }
  }

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(total),
      'Accept-Ranges': 'bytes',
      'Cache-Control': cache,
    },
  })
}
