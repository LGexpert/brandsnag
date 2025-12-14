import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '../env'

let pool: Pool | undefined

export type DbClient = ReturnType<typeof drizzle>

let db: DbClient | undefined

export function getDb(): DbClient | null {
  if (!env.DATABASE_URL) return null

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
    })
  }

  if (!db) {
    db = drizzle(pool)
  }

  return db
}

export async function closeDb() {
  await pool?.end()
  pool = undefined
  db = undefined
}
