import { eq, desc, and } from 'drizzle-orm'
import { Router, type Response } from 'express'

import { db } from '../db/client'
import { usernameChecks } from '../db/schema'
import { authenticate, type AuthRequest } from '../middleware/auth'

export const historyRouter = Router()

historyRouter.get('/api/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const platformId = req.query.platformId ? parseInt(req.query.platformId as string) : null

    let whereCondition = eq(usernameChecks.userId, req.user!.userId)

    if (platformId) {
      whereCondition = and(whereCondition, eq(usernameChecks.platformId, platformId))!
    }

    const history = await db.query.usernameChecks.findMany({
      where: whereCondition,
      with: {
        platform: true,
      },
      orderBy: desc(usernameChecks.checkedAt),
      limit,
      offset,
    })

    const countResult = await db
      .select({ count: usernameChecks.id })
      .from(usernameChecks)
      .where(whereCondition)

    const total = countResult.length

    return res.status(200).json({
      history,
      pagination: {
        limit,
        offset,
        total,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})
