// Secret de signature des sessions et de chiffrement des mots de passe SMTP.
// En production il est obligatoire : l'ancien repli codé en dur est public
// (dépôt GitHub), il permettrait à n'importe qui de forger une session
// SUPERADMIN et de déchiffrer les mots de passe d'application stockés.
// Lu à l'usage (pas à l'import) pour que `next build` ne casse pas.
const DEV_FALLBACK_SECRET = 'a-very-secure-fallback-secret-for-b2b-analytics-portal-2026'

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET manquant : obligatoire en production (openssl rand -hex 32).')
  }
  return DEV_FALLBACK_SECRET
}
