import crypto from 'crypto'
import { getSessionSecret } from './secret'

// Derive a 32-byte AES key from the session secret so no extra env var is required.
function getKey(): Buffer {
  return crypto.createHash('sha256').update(getSessionSecret()).digest()
}

// Encrypts a secret (e.g. an SMTP app password) for storage in the database.
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptSecret(cipherText: string): string {
  const raw = Buffer.from(cipherText, 'base64')
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
