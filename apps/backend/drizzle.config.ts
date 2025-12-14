import path from 'node:path'

import dotenv from 'dotenv'
import type { Config } from 'drizzle-kit'

dotenv.config({
  path: process.env.DOTENV_PATH ?? path.resolve(__dirname, '../../.env'),
})

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run drizzle-kit')
}

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config
