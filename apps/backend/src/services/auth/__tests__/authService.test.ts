import { describe, expect, it, beforeAll } from 'vitest'

import { AuthService } from '../authService'

describe('AuthService', () => {
  let authService: AuthService

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
    process.env.JWT_EXPIRES_IN = '15m'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'
    authService = new AuthService()
  })

  describe('password hashing', () => {
    it('should hash a password', async () => {
      const password = 'securePassword123'
      const hash = await authService.hashPassword(password)
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should verify a correct password', async () => {
      const password = 'securePassword123'
      const hash = await authService.hashPassword(password)
      const isValid = await authService.verifyPassword(hash, password)
      expect(isValid).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const password = 'securePassword123'
      const hash = await authService.hashPassword(password)
      const isValid = await authService.verifyPassword(hash, 'wrongPassword')
      expect(isValid).toBe(false)
    })

    it('should reject an invalid hash', async () => {
      const isValid = await authService.verifyPassword('invalid-hash', 'password')
      expect(isValid).toBe(false)
    })
  })

  describe('JWT tokens', () => {
    it('should generate an access token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      }
      const token = authService.generateAccessToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should generate a refresh token', () => {
      const payload = {
        userId: 1,
        sessionId: 1,
      }
      const token = authService.generateRefreshToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should verify a valid access token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      }
      const token = authService.generateAccessToken(payload)
      const decoded = authService.verifyAccessToken(token)
      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe(payload.userId)
      expect(decoded?.email).toBe(payload.email)
      expect(decoded?.role).toBe(payload.role)
    })

    it('should verify a valid refresh token', () => {
      const payload = {
        userId: 1,
        sessionId: 1,
      }
      const token = authService.generateRefreshToken(payload)
      const decoded = authService.verifyRefreshToken(token)
      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe(payload.userId)
      expect(decoded?.sessionId).toBe(payload.sessionId)
    })

    it('should reject an invalid access token', () => {
      const decoded = authService.verifyAccessToken('invalid-token')
      expect(decoded).toBeNull()
    })

    it('should reject an invalid refresh token', () => {
      const decoded = authService.verifyRefreshToken('invalid-token')
      expect(decoded).toBeNull()
    })

    it('should not accept a refresh token as an access token', () => {
      const payload = {
        userId: 1,
        sessionId: 1,
      }
      const refreshToken = authService.generateRefreshToken(payload)
      const decoded = authService.verifyAccessToken(refreshToken)
      expect(decoded).toBeNull()
    })

    it('should not accept an access token as a refresh token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      }
      const accessToken = authService.generateAccessToken(payload)
      const decoded = authService.verifyRefreshToken(accessToken)
      expect(decoded).toBeNull()
    })
  })

  describe('token expiration', () => {
    it('should return a future date for access token expiration', () => {
      const expiration = authService.getAccessTokenExpiration()
      expect(expiration).toBeInstanceOf(Date)
      expect(expiration.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return a future date for refresh token expiration', () => {
      const expiration = authService.getRefreshTokenExpiration()
      expect(expiration).toBeInstanceOf(Date)
      expect(expiration.getTime()).toBeGreaterThan(Date.now())
    })
  })
})
