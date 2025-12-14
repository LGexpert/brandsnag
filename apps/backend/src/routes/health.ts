import type { HealthResponse } from '@acme/shared'
import { Router } from 'express'


export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  const payload: HealthResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
  }

  res.json(payload)
})
