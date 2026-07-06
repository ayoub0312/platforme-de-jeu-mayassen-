import { z } from 'zod'

// Validation des variables d'environnement au démarrage. La plupart ont un
// repli local déjà géré ailleurs (Redis en mémoire, SQLite local, secret de
// session par défaut) — on ne bloque donc jamais le démarrage, on avertit
// juste clairement en développement si une variable de production manque.
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  TURSO_DATABASE_URL: z.string().url("TURSO_DATABASE_URL doit être une URL valide (libsql://...).").optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL doit être une URL valide.').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  APP_BASE_URL: z.string().url('APP_BASE_URL doit être une URL valide (ex: https://obooking-gift.com).').optional(),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET doit contenir au moins 16 caractères.').optional(),
  SHARED_API_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')} : ${issue.message}`).join('\n')
  console.warn(
    `[env] Variables d'environnement invalides détectées au démarrage :\n${issues}\n` +
      "Ces variables ont un repli local automatique (voir .env.example) mais doivent être correctement définies en production."
  )
}

// Avertissements explicites pour les variables sans lesquelles certaines
// fonctionnalités tournent en mode dégradé (déjà géré avec grâce ailleurs
// dans le code — ceci ne fait que rendre le repli visible au démarrage).
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('[env] UPSTASH_REDIS_REST_URL/TOKEN manquant(s) — rate limiting et stock atomique en mémoire locale uniquement (non partagé entre instances).')
}
if (!process.env.SESSION_SECRET) {
  console.warn('[env] SESSION_SECRET manquant — un secret de repli est utilisé. À définir impérativement en production.')
}
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.warn('[env] TURSO_DATABASE_URL/AUTH_TOKEN manquant(s) — utilisation de la base SQLite locale (DATABASE_URL).')
}

export const env: Env = parsed.success ? parsed.data : (process.env as unknown as Env)
