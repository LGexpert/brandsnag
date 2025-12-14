import cors from 'cors'
import express from 'express'
import pinoHttp from 'pino-http'

import { env } from './env'
import { logger } from './logger'
import { authRouter } from './routes/auth'
import { checkRouter } from './routes/check'
import { favoritesRouter } from './routes/favorites'
import { healthRouter } from './routes/health'
import { historyRouter } from './routes/history'
import { platformsRouter } from './routes/platforms'
import { watchlistRouter } from './routes/watchlist'

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
  app.use(authRouter)
  app.use(checkRouter)
  app.use(platformsRouter)
  app.use(favoritesRouter)
  app.use(watchlistRouter)
  app.use(historyRouter)

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const message = err instanceof Error ? err.message : 'unknown error'
      res.status(500).json({ error: 'internal_error', message })
    },
  )

  return app
}
