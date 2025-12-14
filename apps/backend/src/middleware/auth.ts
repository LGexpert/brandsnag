import type { Request, Response, NextFunction } from 'express'

import { AuthService } from '../services/auth/authService'

const authService = new AuthService()

export interface AuthRequest extends Request {
  user?: {
    userId: number
    email: string
    role: string
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid authorization header',
    })
  }

  const token = authHeader.substring(7)
  const payload = authService.verifyAccessToken(token)

  if (!payload) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
    })
  }

  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  }

  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required',
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient permissions',
      })
    }

    next()
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = authService.verifyAccessToken(token)

    if (payload) {
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      }
    }
  }

  next()
}
