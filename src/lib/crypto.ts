import crypto from 'crypto'

// Derive a 32-byte AES key from the session secret so no extra env var is required.
const SECRET = process.env.SESSION_SECRET || 'a-very-secure-fallback-secret-for-b2b-analytics-portal-2026'
const KEY = crypto.createHash('sha256').update(SECRET).digest()

// Encrypts a secret (e.g. an SMTP app password) for storage in the database.
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptSecret(cipherText: string): string {
  const raw = Buffer.from(cipherText, 'base64')
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
