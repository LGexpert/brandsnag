import cors from 'cors'
import express from 'express'
import pinoHttp from 'pino-http'

import { env } from './env'
import { logger } from './logger'
import { checkRouter } from './routes/check'
import { healthRouter } from './routes/health'

export function createApp() {
  const app = express()

  app.use(
    pinoHttp({
      logger,
    }),
  )

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim())
  const corsOrigin = env.CORS_ORIGIN === '*' ? true : allowedOrigins

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  )

  app.use(express.json())

  app.use(healthRouter)
  app.use(checkRouter)

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'unknown error'
    res.status(500).json({ error: 'internal_error', message })
  })

  return app
}
