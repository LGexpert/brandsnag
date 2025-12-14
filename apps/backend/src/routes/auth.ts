import { eq, and } from 'drizzle-orm'
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'

import { db } from '../db/client'
import { users, sessions } from '../db/schema'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { AuthService } from '../services/auth/authService'

const authService = new AuthService()

export const authRouter = Router()

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

authRouter.post('/api/auth/signup', async (req: Request, res: Response) => {
  const parse = signupSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      error: 'invalid_request',
      details: parse.error.flatten(),
    })
  }

  const { email, password, displayName } = parse.data

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return res.status(409).json({
        error: 'user_exists',
        message: 'User with this email already exists',
      })
    }

    const passwordHash = await authService.hashPassword(password)

    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        displayName: displayName || null,
        role: 'user',
      })
      .returning()

    const refreshTokenExpiration = authService.getRefreshTokenExpiration()
    const refreshToken = authService.generateRefreshToken({
      userId: user.id,
      sessionId: 0,
    })

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        token: refreshToken,
        status: 'active',
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        expiresAt: refreshTokenExpiration,
      })
      .returning()

    const actualRefreshToken = authService.generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    })

    await db.update(sessions).set({ token: actualRefreshToken }).where(eq(sessions.id, session.id))

    const accessToken = authService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return res.status(201).json({
      accessToken,
      refreshToken: actualRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
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

authRouter.post('/api/auth/login', async (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      error: 'invalid_request',
      details: parse.error.flatten(),
    })
  }

  const { email, password } = parse.data

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!user) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      })
    }

    const isValid = await authService.verifyPassword(user.passwordHash, password)

    if (!isValid) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      })
    }

    const refreshTokenExpiration = authService.getRefreshTokenExpiration()
    const refreshToken = authService.generateRefreshToken({
      userId: user.id,
      sessionId: 0,
    })

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        token: refreshToken,
        status: 'active',
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        expiresAt: refreshTokenExpiration,
      })
      .returning()

    const actualRefreshToken = authService.generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    })

    await db.update(sessions).set({ token: actualRefreshToken }).where(eq(sessions.id, session.id))

    const accessToken = authService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return res.status(200).json({
      accessToken,
      refreshToken: actualRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
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

authRouter.post('/api/auth/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Refresh token is required',
    })
  }

  try {
    const payload = authService.verifyRefreshToken(refreshToken)

    if (!payload) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid or expired refresh token',
      })
    }

    const session = await db.query.sessions.findFirst({
      where: and(eq(sessions.id, payload.sessionId), eq(sessions.token, refreshToken)),
      with: {
        user: true,
      },
    })

    if (!session || !session.user) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Session not found',
      })
    }

    if (session.status !== 'active') {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Session is not active',
      })
    }

    if (session.expiresAt < new Date()) {
      await db.update(sessions).set({ status: 'expired' }).where(eq(sessions.id, session.id))

      return res.status(401).json({
        error: 'invalid_token',
        message: 'Session has expired',
      })
    }

    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, session.id))

    const accessToken = authService.generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    })

    return res.status(200).json({
      accessToken,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})

authRouter.post('/api/auth/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Missing authorization header',
      })
    }

    await db
      .update(sessions)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(eq(sessions.userId, req.user!.userId))

    return res.status(200).json({
      message: 'Logged out successfully',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})

authRouter.get('/api/auth/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.userId),
    })

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      })
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'internal_error',
      message,
    })
  }
})
