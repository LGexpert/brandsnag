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

  CHECK_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  CHECK_CACHE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  CHECK_PER_PLATFORM_CONCURRENCY: z.coerce.number().int().positive().default(3),
  CHECK_PER_PLATFORM_MAX_RPS: z.coerce.number().int().nonnegative().default(10),
  CHECK_BULK_MAX_CONCURRENCY: z.coerce.number().int().positive().default(5),
  CHECK_BULK_MAX_HANDLES: z.coerce.number().int().positive().default(50),
})

export const env = envSchema.parse(process.env)
