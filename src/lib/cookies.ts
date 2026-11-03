// Cookies de session posés côté serveur (Set-Cookie) : HttpOnly pour qu'un
// script injecté (XSS) ne puisse pas lire le jeton, Secure en production.
export const ADMIN_SESSION_COOKIE = 'admin_session'
export const CUSTOMER_SESSION_COOKIE = 'customer_session'

export function sessionCookie(name: string, token: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${name}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Strict${secure}`
}

export function clearedSessionCookie(name: string): string {
  return sessionCookie(name, '', 0)
}
