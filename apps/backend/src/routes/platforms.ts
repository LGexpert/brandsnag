import { asc, eq } from 'drizzle-orm'
import { Router, type Response } from 'express'

import { db } from '../db/client'
import { platforms } from '../db/schema'

export const platformsRouter = Router()

platformsRouter.get('/api/platforms', async (_req, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(platforms)
      .where(eq(platforms.status, 'active'))
      .orderBy(asc(platforms.sortOrder))

    return res.status(200).json({
      platforms: rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})
