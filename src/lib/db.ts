import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Rename the global cache key to 'prisma_v3' to force Next.js to invalidate
// the in-memory cache and recreate the client with our path-resolution fix.
// Type `any` : le client exporté est un client Prisma ÉTENDU (voir buildPrisma
// plus bas), dont le type ne peut être référencé ici sans circularité.
const globalForPrisma = globalThis as unknown as { prisma_v3: any }

const getPrismaClient = () => {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  const useRemote = !!(tursoUrl && tursoUrl.trim() !== '' && tursoToken && tursoToken.trim() !== '')

  // TRIM impératif : une valeur d'env avec un espace ou un saut de ligne parasite
  // (fréquent après un copier-coller dans le dashboard Vercel) rend l'URL invalide
  // → "Invalid URL" côté Prisma/libSQL et casse toute l'app. On nettoie donc ici.
  let url = useRemote ? tursoUrl!.trim() : (process.env.DATABASE_URL || 'file:./dev.db').trim()
  const authToken = useRemote ? tursoToken!.trim() : undefined

  // Diagnostic (masqué) : révèle un problème de valeur d'env sans exposer le
  // secret. Aide à distinguer "URL propre", "espace parasite", "token collé
  // dans le champ URL par erreur", etc. — visible dans les logs Vercel.
  if (useRemote) {
    let scheme = 'INCONNU'
    try {
      scheme = new URL(url).protocol
    } catch {
      scheme = 'INVALIDE(pas-une-URL)'
    }
    console.log(`[DB Diag] useRemote=true | url.length=${url.length} | debut="${url.slice(0, 14)}" | scheme=${scheme} | token.length=${authToken?.length ?? 0}`)
  } else {
    console.log(`[DB Diag] useRemote=false (TURSO_DATABASE_URL/TOKEN manquant ou vide) — bascule sur ${url}`)
  }

  // Dynamically resolve local SQLite path ONLY in Node.js context (local dev/seeding).
  // Uses environment-safe process['cwd']() string operations to work in ESM (no require needed)
  // and avoids bundler static analysis warnings.
  const isEdge = typeof process !== 'undefined' && process.env?.NEXT_RUNTIME === 'edge'
  const cwdFn = typeof process !== 'undefined' ? process['cwd'] : undefined

  const resolveAbsoluteFileUrl = (fileUrl: string): string => {
    if (typeof cwdFn !== 'function' || !fileUrl.startsWith('file:')) return fileUrl
    try {
      const filePath = fileUrl.replace(/^file:/, '')
      const cwd = cwdFn.call(process).replace(/\\/g, '/')
      const cleanFilePath = filePath.replace(/\\/g, '/')
      const isAbsolute = /^[a-zA-Z]:/.test(cleanFilePath) || cleanFilePath.startsWith('/')
      if (!isAbsolute) {
        const relativePart = cleanFilePath.replace(/^\.\//, '')
        return `file:${cwd}/${relativePart}`
      }
      return fileUrl
    } catch (err) {
      console.warn('Failed to resolve absolute database URL dynamically, using fallback relative url.', err)
      return fileUrl
    }
  }

  // --- Turso EMBEDDED REPLICA (Node runtime only) -------------------------
  // En runtime Node (dev local, seeding, serverful), on lit depuis une réplique
  // SQLite LOCALE synchronisée en arrière-plan avec Turso : lectures ~2ms au
  // lieu de ~100-600ms d'aller-retour réseau. Les écritures partent vers le
  // primaire Turso et `readYourWrites` (défaut) les rend visibles localement
  // immédiatement ; les écritures d'autres sources apparaissent sous `syncInterval`.
  // IMPORTANT : la réplique écrit un fichier local (.turso-replica.db) et
  // resynchronise ~8 Mo au démarrage. Ça ne convient QU'AU dev local/serverful.
  // Sur l'Edge ET sur le serverless (Vercel/Lambda/Netlify) le système de
  // fichiers est en lecture seule (ou éphémère) → on force le mode distant
  // direct, sinon les requêtes échouent/rament. Échappatoire : TURSO_DISABLE_REPLICA=1.
  const replicaDisabled = process.env.TURSO_DISABLE_REPLICA === '1'
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
  )
  if (useRemote && !isEdge && !isServerless && !replicaDisabled && typeof cwdFn === 'function') {
    const replicaUrl = resolveAbsoluteFileUrl('file:./.turso-replica.db')
    const adapter = new PrismaLibSql({
      url: replicaUrl,
      syncUrl: tursoUrl!,
      authToken,
      syncInterval: 60,
    })
    return new PrismaClient({ adapter })
  }

  if (!useRemote && !isEdge) {
    console.log(`[Database Init] Original URL: ${url}`)
    url = resolveAbsoluteFileUrl(url)
    console.log(`[Database Init] Resolved absolute URL: ${url}`)
  }

  const adapter = new PrismaLibSql({
    url,
    authToken,
  })

  return new PrismaClient({ adapter })
}

// Erreurs TRANSITOIRES de connexion libSQL/Turso (réseau instable, stream Hrana
// expiré). Le message "stream not found" signifie que le serveur a rejeté la
// requête AVANT de l'exécuter (le stream n'existait plus) : la requête n'a donc
// PAS été appliquée → réessayer est sûr (pas de risque de double écriture).
function isTransientDbError(err: unknown): boolean {
  const msg = ((err as any)?.message ?? String(err ?? '')).toLowerCase()
  return (
    msg.includes('stream not found') ||
    msg.includes('stream expired') ||
    msg.includes('hrana') ||
    msg.includes('websocket') ||
    msg.includes('connection reset') ||
    msg.includes('unexpected eof') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed')
  )
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Enveloppe le client Prisma d'une extension qui réessaie automatiquement toute
// opération échouée sur une erreur transitoire (jusqu'à 3 tentatives, avec un
// court backoff). Garde la vitesse de la réplique tout en absorbant les
// coupures réseau vers Turso.
function buildPrisma() {
  return getPrismaClient().$extends({
    query: {
      async $allOperations({ args, query }: { args: unknown; query: (a: unknown) => Promise<unknown> }) {
        let lastErr: unknown
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await query(args)
          } catch (err) {
            lastErr = err
            if (attempt < 2 && isTransientDbError(err)) {
              await sleep(150 * (attempt + 1))
              continue
            }
            throw err
          }
        }
        throw lastErr
      },
    },
  })
}

export const prisma: ReturnType<typeof buildPrisma> = globalForPrisma.prisma_v3 || buildPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_v3 = prisma
