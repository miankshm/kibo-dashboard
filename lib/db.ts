import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined
}

const db = process.env.DATABASE_URL
  ? (() => {
      const sql = globalForDb.sql ?? postgres(process.env.DATABASE_URL!, { prepare: false })

      if (process.env.NODE_ENV !== 'production') {
        globalForDb.sql = sql
      }

      return drizzle(sql, { schema })
    })()
  : (null as unknown as ReturnType<typeof drizzle>)

export { db }
