import { afterAll, beforeAll } from 'vitest'

import { closeDb } from '../db/client'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'
})

afterAll(async () => {
  await closeDb()
})
