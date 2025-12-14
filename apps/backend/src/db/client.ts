import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '../env'

import * as schema from './schema'

let pool: Pool | undefined

export type DbClient = ReturnType<typeof drizzle>

let dbInstance: DbClient | undefined

export function getDb(): DbClient | null {
  if (!env.DATABASE_URL) return null

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
    })
  }

  if (!dbInstance) {
    dbInstance = drizzle(pool, { schema })
  }

  return dbInstance
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    const instance = getDb()
    if (!instance) {
      throw new Error('Database not configured')
    }
    return instance[prop as keyof DbClient]
  },
})

export async function closeDb() {
  await pool?.end()
  pool = undefined
  dbInstance = undefined
}
