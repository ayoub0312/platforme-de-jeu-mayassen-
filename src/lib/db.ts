import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Rename the global cache key to 'prisma_v3' to force Next.js to invalidate
// the in-memory cache and recreate the client with our path-resolution fix.
const globalForPrisma = globalThis as unknown as { prisma_v3: PrismaClient }

const getPrismaClient = () => {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  const useRemote = !!(tursoUrl && tursoUrl.trim() !== '' && tursoToken && tursoToken.trim() !== '')

  let url = useRemote ? tursoUrl! : (process.env.DATABASE_URL || "file:./dev.db")
  const authToken = useRemote ? tursoToken : undefined

  // Dynamically resolve local SQLite path ONLY in Node.js context (local dev/seeding).
  // Uses environment-safe process['cwd']() string operations to work in ESM (no require needed)
  // and avoids bundler static analysis warnings.
  const isEdge = typeof process !== 'undefined' && process.env?.NEXT_RUNTIME === 'edge'
  const cwdFn = typeof process !== 'undefined' ? process['cwd'] : undefined

  if (!useRemote && !isEdge && typeof cwdFn === 'function' && url.startsWith('file:')) {
    try {
      const filePath = url.replace(/^file:/, '')
      const cwd = cwdFn.call(process).replace(/\\/g, '/')
      const cleanFilePath = filePath.replace(/\\/g, '/')
      
      console.log(`[Database Init] cwd: ${cwd}`)
      console.log(`[Database Init] Original URL: ${url}`)
      
      // If path is not already absolute (does not start with drive letter C: or root /)
      const isAbsolute = /^[a-zA-Z]:/.test(cleanFilePath) || cleanFilePath.startsWith('/')
      if (!isAbsolute) {
        const relativePart = cleanFilePath.replace(/^\.\//, '')
        url = `file:${cwd}/${relativePart}`
      }
      console.log(`[Database Init] Resolved absolute URL: ${url}`)
    } catch (err) {
      console.warn('Failed to resolve absolute database URL dynamically, using fallback relative url.', err)
    }
  }

  const adapter = new PrismaLibSql({
    url,
    authToken,
  })
  
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma_v3 || getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_v3 = prisma
