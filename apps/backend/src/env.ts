import path from 'node:path'

import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({
  path: process.env.DOTENV_PATH ?? path.resolve(__dirname, '../../../.env'),
})

const envSchema = z.object({
  BACKEND_PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.string().optional(),
  NODE_ENV: z.string().optional(),
})

export const env = envSchema.parse(process.env)
