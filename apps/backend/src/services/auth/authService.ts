import argon2 from 'argon2'
import jwt from 'jsonwebtoken'

import { env } from '../../env'

export interface TokenPayload {
  userId: number
  email: string
  role: string
}

export interface RefreshTokenPayload {
  userId: number
  sessionId: number
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password)
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    })
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    })
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload
      return decoded
    } catch {
      return null
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
      return decoded
    } catch {
      return null
    }
  }

  getAccessTokenExpiration(): Date {
    const expiresIn = env.JWT_EXPIRES_IN
    const ms = this.parseTimeToMs(expiresIn)
    return new Date(Date.now() + ms)
  }

  getRefreshTokenExpiration(): Date {
    const expiresIn = env.JWT_REFRESH_EXPIRES_IN
    const ms = this.parseTimeToMs(expiresIn)
    return new Date(Date.now() + ms)
  }

  private parseTimeToMs(time: string): number {
    const unit = time.slice(-1)
    const value = parseInt(time.slice(0, -1), 10)

    switch (unit) {
      case 's':
        return value * 1000
      case 'm':
        return value * 60 * 1000
      case 'h':
        return value * 60 * 60 * 1000
      case 'd':
        return value * 24 * 60 * 60 * 1000
      default:
        throw new Error(`Invalid time unit: ${unit}`)
    }
  }
}
