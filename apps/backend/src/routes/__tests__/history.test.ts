import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../app'

let accessToken: string
let app: ReturnType<typeof createApp>

beforeEach(async () => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'
  vi.clearAllMocks()

  app = createApp()

  const signupRes = await request(app).post('/api/auth/signup').send({
    email: 'history@example.com',
    password: 'securePassword123',
  })

  accessToken = signupRes.body.accessToken
})

describe('GET /api/history', () => {
  it('should return empty array for user with no history', async () => {
    const res = await request(app).get('/api/history').set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.history).toEqual([])
    expect(res.body.pagination).toBeDefined()
    expect(res.body.pagination.limit).toBe(50)
    expect(res.body.pagination.offset).toBe(0)
  })

  it('should return username check history after checks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )

    await request(app)
      .post('/api/check')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        handle: 'testhandle',
        platformKeys: ['x'],
      })

    const res = await request(app).get('/api/history').set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.history)).toBe(true)
    expect(res.body.history.length).toBeGreaterThan(0)
    expect(res.body.history[0].handle).toBe('testhandle')
  })

  it('should support pagination', async () => {
    const res = await request(app)
      .get('/api/history?limit=10&offset=5')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.pagination.limit).toBe(10)
    expect(res.body.pagination.offset).toBe(5)
  })

  it('should filter by platform', async () => {
    const res = await request(app)
      .get('/api/history?platformId=1')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.history)).toBe(true)
  })

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/history')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})
