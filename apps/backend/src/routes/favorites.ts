import { eq, and } from 'drizzle-orm'
import { Router, type Response } from 'express'
import { z } from 'zod'

import { db } from '../db/client'
import { favorites } from '../db/schema'
import { authenticate, type AuthRequest } from '../middleware/auth'

export const favoritesRouter = Router()

const addFavoriteSchema = z.object({
  platformId: z.number().int().positive(),
  handle: z.string().min(1),
  tags: z.string().optional(),
  notes: z.string().optional(),
})

const updateFavoriteSchema = z.object({
  tags: z.string().optional(),
  notes: z.string().optional(),
})

favoritesRouter.get('/api/favorites', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userFavorites = await db.query.favorites.findMany({
      where: eq(favorites.userId, req.user!.userId),
      with: {
        platform: true,
      },
      orderBy: (favorites, { desc }) => [desc(favorites.createdAt)],
    })

    return res.status(200).json({
      favorites: userFavorites,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})

favoritesRouter.post('/api/favorites', authenticate, async (req: AuthRequest, res: Response) => {
  const parse = addFavoriteSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      error: 'invalid_request',
      details: parse.error.flatten(),
    })
  }

  const { platformId, handle, tags, notes } = parse.data

  try {
    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, req.user!.userId),
        eq(favorites.platformId, platformId),
        eq(favorites.handle, handle),
      ),
    })

    if (existing) {
      return res.status(409).json({
        error: 'already_exists',
        message: 'This favorite already exists',
      })
    }

    const [favorite] = await db
      .insert(favorites)
      .values({
        userId: req.user!.userId,
        platformId,
        handle,
        tags: tags || null,
        notes: notes || null,
      })
      .returning()

    const favoriteWithPlatform = await db.query.favorites.findFirst({
      where: eq(favorites.id, favorite.id),
      with: {
        platform: true,
      },
    })

    return res.status(201).json({
      favorite: favoriteWithPlatform,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})

favoritesRouter.patch(
  '/api/favorites/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Invalid favorite ID',
      })
    }

    const parse = updateFavoriteSchema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({
        error: 'invalid_request',
        details: parse.error.flatten(),
      })
    }

    try {
      const existing = await db.query.favorites.findFirst({
        where: and(eq(favorites.id, id), eq(favorites.userId, req.user!.userId)),
      })

      if (!existing) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Favorite not found',
        })
      }

      const [updated] = await db
        .update(favorites)
        .set({
          tags: parse.data.tags !== undefined ? parse.data.tags : existing.tags,
          notes: parse.data.notes !== undefined ? parse.data.notes : existing.notes,
        })
        .where(eq(favorites.id, id))
        .returning()

      const favoriteWithPlatform = await db.query.favorites.findFirst({
        where: eq(favorites.id, updated.id),
        with: {
          platform: true,
        },
      })

      return res.status(200).json({
        favorite: favoriteWithPlatform,
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

favoritesRouter.delete(
  '/api/favorites/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Invalid favorite ID',
      })
    }

    try {
      const existing = await db.query.favorites.findFirst({
        where: and(eq(favorites.id, id), eq(favorites.userId, req.user!.userId)),
      })

      if (!existing) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Favorite not found',
        })
      }

      await db.delete(favorites).where(eq(favorites.id, id))

      return res.status(200).json({
        message: 'Favorite deleted successfully',
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
