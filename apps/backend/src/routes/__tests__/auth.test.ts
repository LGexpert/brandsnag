import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../app'

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'
  vi.clearAllMocks()
})

describe('POST /api/auth/signup', () => {
  it('should create a new user', async () => {
    const app = createApp()

    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'securePassword123',
      displayName: 'Test User',
    })

    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe('test@example.com')
    expect(res.body.user.displayName).toBe('Test User')
    expect(res.body.user.role).toBe('user')
    expect(res.body.user.id).toBeDefined()
  })

  it('should reject invalid email', async () => {
    const app = createApp()

    const res = await request(app).post('/api/auth/signup').send({
      email: 'invalid-email',
      password: 'securePassword123',
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_request')
  })

  it('should reject short password', async () => {
    const app = createApp()

    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'short',
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_request')
  })
})

describe('POST /api/auth/login', () => {
  it('should login an existing user', async () => {
    const app = createApp()

    await request(app).post('/api/auth/signup').send({
      email: 'login@example.com',
      password: 'securePassword123',
    })

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'securePassword123',
    })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe('login@example.com')
  })

  it('should reject invalid credentials', async () => {
    const app = createApp()

    await request(app).post('/api/auth/signup').send({
      email: 'login2@example.com',
      password: 'securePassword123',
    })

    const res = await request(app).post('/api/auth/login').send({
      email: 'login2@example.com',
      password: 'wrongPassword',
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_credentials')
  })

  it('should reject non-existent user', async () => {
    const app = createApp()

    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'securePassword123',
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_credentials')
  })
})

describe('GET /api/auth/me', () => {
  it('should return current user info', async () => {
    const app = createApp()

    const signupRes = await request(app).post('/api/auth/signup').send({
      email: 'me@example.com',
      password: 'securePassword123',
      displayName: 'Me User',
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signupRes.body.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('me@example.com')
    expect(res.body.displayName).toBe('Me User')
    expect(res.body.role).toBe('user')
  })

  it('should reject request without token', async () => {
    const app = createApp()

    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })

  it('should reject request with invalid token', async () => {
    const app = createApp()

    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid-token')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})

describe('POST /api/auth/refresh', () => {
  it('should refresh access token', async () => {
    const app = createApp()

    const signupRes = await request(app).post('/api/auth/signup').send({
      email: 'refresh@example.com',
      password: 'securePassword123',
    })

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: signupRes.body.refreshToken,
    })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('should reject invalid refresh token', async () => {
    const app = createApp()

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'invalid-token',
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_token')
  })
})

describe('POST /api/auth/logout', () => {
  it('should logout user', async () => {
    const app = createApp()

    const signupRes = await request(app).post('/api/auth/signup').send({
      email: 'logout@example.com',
      password: 'securePassword123',
    })

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${signupRes.body.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()
  })

  it('should reject request without token', async () => {
    const app = createApp()

    const res = await request(app).post('/api/auth/logout')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})
