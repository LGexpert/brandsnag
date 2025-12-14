import { eq, and } from 'drizzle-orm'
import { Router, type Response } from 'express'
import { z } from 'zod'

import { db } from '../db/client'
import { watchlistItems } from '../db/schema'
import { authenticate, type AuthRequest } from '../middleware/auth'

export const watchlistRouter = Router()

const addWatchlistItemSchema = z.object({
  platformId: z.number().int().positive(),
  handle: z.string().min(1),
  tags: z.string().optional(),
  notes: z.string().optional(),
})

const updateWatchlistItemSchema = z.object({
  status: z.enum(['active', 'paused', 'archived']).optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
})

watchlistRouter.get('/api/watchlist', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userWatchlist = await db.query.watchlistItems.findMany({
      where: eq(watchlistItems.userId, req.user!.userId),
      with: {
        platform: true,
      },
      orderBy: (watchlistItems, { desc }) => [desc(watchlistItems.createdAt)],
    })

    return res.status(200).json({
      watchlist: userWatchlist,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})

watchlistRouter.post('/api/watchlist', authenticate, async (req: AuthRequest, res: Response) => {
  const parse = addWatchlistItemSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      error: 'invalid_request',
      details: parse.error.flatten(),
    })
  }

  const { platformId, handle, tags, notes } = parse.data

  try {
    const existing = await db.query.watchlistItems.findFirst({
      where: and(
        eq(watchlistItems.userId, req.user!.userId),
        eq(watchlistItems.platformId, platformId),
        eq(watchlistItems.handle, handle),
      ),
    })

    if (existing) {
      return res.status(409).json({
        error: 'already_exists',
        message: 'This watchlist item already exists',
      })
    }

    const [item] = await db
      .insert(watchlistItems)
      .values({
        userId: req.user!.userId,
        platformId,
        handle,
        status: 'active',
        tags: tags || null,
        notes: notes || null,
      })
      .returning()

    const itemWithPlatform = await db.query.watchlistItems.findFirst({
      where: eq(watchlistItems.id, item.id),
      with: {
        platform: true,
      },
    })

    return res.status(201).json({
      watchlistItem: itemWithPlatform,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})

watchlistRouter.patch(
  '/api/watchlist/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Invalid watchlist item ID',
      })
    }

    const parse = updateWatchlistItemSchema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({
        error: 'invalid_request',
        details: parse.error.flatten(),
      })
    }

    try {
      const existing = await db.query.watchlistItems.findFirst({
        where: and(eq(watchlistItems.id, id), eq(watchlistItems.userId, req.user!.userId)),
      })

      if (!existing) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Watchlist item not found',
        })
      }

      const [updated] = await db
        .update(watchlistItems)
        .set({
          status: parse.data.status !== undefined ? parse.data.status : existing.status,
          tags: parse.data.tags !== undefined ? parse.data.tags : existing.tags,
          notes: parse.data.notes !== undefined ? parse.data.notes : existing.notes,
        })
        .where(eq(watchlistItems.id, id))
        .returning()

      const itemWithPlatform = await db.query.watchlistItems.findFirst({
        where: eq(watchlistItems.id, updated.id),
        with: {
          platform: true,
        },
      })

      return res.status(200).json({
        watchlistItem: itemWithPlatform,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return res.status(500).json({
        error: 'internal_error',
        message,
      })
    }
  },
)

watchlistRouter.delete(
  '/api/watchlist/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Invalid watchlist item ID',
      })
    }

    try {
      const existing = await db.query.watchlistItems.findFirst({
        where: and(eq(watchlistItems.id, id), eq(watchlistItems.userId, req.user!.userId)),
      })

      if (!existing) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Watchlist item not found',
        })
      }

      await db.delete(watchlistItems).where(eq(watchlistItems.id, id))

      return res.status(200).json({
        message: 'Watchlist item deleted successfully',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return res.status(500).json({
        error: 'internal_error',
        message,
      })
    }
  },
)
