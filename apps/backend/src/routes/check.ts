import { Router, type Request, type Response } from 'express'
import { z } from 'zod'

import { env } from '../env'
import { optionalAuth, type AuthRequest } from '../middleware/auth'
import { HandleCheckService } from '../services/handleChecks/handleCheckService'
import { handleSchema, platformKeySchema } from '../services/handleChecks/types'

const checkRequestSchema = z
  .object({
    handle: handleSchema,
    platformKeys: z.array(platformKeySchema).optional(),
    platforms: z.array(platformKeySchema).optional(),
  })
  .transform((v) => ({
    handle: v.handle,
    platformKeys: v.platformKeys ?? v.platforms,
  }))

const bulkCheckRequestSchema = z
  .object({
    handles: z.array(handleSchema).min(1),
    platformKeys: z.array(platformKeySchema).optional(),
    platforms: z.array(platformKeySchema).optional(),
  })
  .transform((v) => ({
    handles: v.handles,
    platformKeys: v.platformKeys ?? v.platforms,
  }))

const service = new HandleCheckService({
  cacheTtlMs: env.CHECK_CACHE_TTL_MS,
  timeoutMs: env.CHECK_HTTP_TIMEOUT_MS,
  perPlatformConcurrency: env.CHECK_PER_PLATFORM_CONCURRENCY,
  perPlatformMaxRps: env.CHECK_PER_PLATFORM_MAX_RPS,
  bulkMaxConcurrency: env.CHECK_BULK_MAX_CONCURRENCY,
})

export const checkRouter = Router()

function wantsSse(req: Request) {
  const accept = req.headers.accept ?? ''
  return accept.includes('text/event-stream') || req.query.stream === '1'
}

function writeSse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

checkRouter.post('/api/check', optionalAuth, async (req: AuthRequest, res) => {
  const parse = checkRequestSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      error: 'invalid_request',
      details: parse.error.flatten(),
    })
  }

  if (!wantsSse(req)) {
    const payload = await service.checkHandle({
      handle: parse.data.handle,
      platformKeys: parse.data.platformKeys,
      userId: req.user?.userId,
    })

    return res.json(payload)
  }

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let closed = false
  req.on('close', () => {
    closed = true
  })

  writeSse(res, 'meta', {
    handle: parse.data.handle,
    requestedAt: new Date().toISOString(),
  })

  try {
    const payload = await service.checkHandle({
      handle: parse.data.handle,
      platformKeys: parse.data.platformKeys,
      userId: req.user?.userId,
      onPartial: ({ handle, result }) => {
        if (closed) return
        writeSse(res, 'result', { handle, result })
      },
    })

    if (!closed) {
      writeSse(res, 'done', payload)
      res.end()
    }
  } catch (err) {
    if (!closed) {
      const message = err instanceof Error ? err.message : 'unknown error'
      writeSse(res, 'error', { message })
      res.end()
    }
  }
})

checkRouter.post('/api/check/bulk', optionalAuth, async (req: AuthRequest, res) => {
  const parse = bulkCheckRequestSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      error: 'invalid_request',
      details: parse.error.flatten(),
    })
  }

  if (parse.data.handles.length > env.CHECK_BULK_MAX_HANDLES) {
    return res.status(400).json({
      error: 'too_many_handles',
      max: env.CHECK_BULK_MAX_HANDLES,
    })
  }

  if (!wantsSse(req)) {
    const payload = await service.checkBulk({
      handles: parse.data.handles,
      platformKeys: parse.data.platformKeys,
      userId: req.user?.userId,
    })

    return res.json(payload)
  }

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let closed = false
  req.on('close', () => {
    closed = true
  })

  writeSse(res, 'meta', {
    handles: parse.data.handles,
    requestedAt: new Date().toISOString(),
  })

  try {
    const payload = await service.checkBulk({
      handles: parse.data.handles,
      platformKeys: parse.data.platformKeys,
      userId: req.user?.userId,
      onPartial: ({ handle, result }) => {
        if (closed) return
        writeSse(res, 'result', { handle, result })
      },
    })

    if (!closed) {
      writeSse(res, 'done', payload)
      res.end()
    }
  } catch (err) {
    if (!closed) {
      const message = err instanceof Error ? err.message : 'unknown error'
      writeSse(res, 'error', { message })
      res.end()
    }
  }
})
