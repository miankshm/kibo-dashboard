import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined
}

let db: ReturnType<typeof drizzle> | null = null

function normalizeDatabaseUrl(raw: string | undefined) {
  if (!raw) {
    return null
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim() || null
  }

  return trimmed
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL)

if (databaseUrl) {
  try {
    const sql = globalForDb.sql ?? postgres(databaseUrl, { prepare: false })

    if (process.env.NODE_ENV !== 'production') {
      globalForDb.sql = sql
    }

    db = drizzle(sql, { schema })
  } catch (error) {
    // Keep module import safe during build; handlers can return graceful errors when db is unavailable.
    console.error('Database initialization failed:', error)
    db = null
  }
}

export { db }
