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
    email: 'watchlist@example.com',
    password: 'securePassword123',
  })

  accessToken = signupRes.body.accessToken
})

describe('GET /api/watchlist', () => {
  it('should return empty array for new user', async () => {
    const res = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.watchlist).toEqual([])
  })

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/watchlist')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})

describe('POST /api/watchlist', () => {
  it('should add a watchlist item', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 1,
        handle: 'testhandle',
        tags: 'tag1,tag2',
        notes: 'Test notes',
      })

    expect(res.status).toBe(201)
    expect(res.body.watchlistItem).toBeDefined()
    expect(res.body.watchlistItem.handle).toBe('testhandle')
    expect(res.body.watchlistItem.tags).toBe('tag1,tag2')
    expect(res.body.watchlistItem.notes).toBe('Test notes')
    expect(res.body.watchlistItem.status).toBe('active')
  })

  it('should reject duplicate watchlist item', async () => {
    await request(app).post('/api/watchlist').set('Authorization', `Bearer ${accessToken}`).send({
      platformId: 1,
      handle: 'duplicate',
    })

    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 1,
        handle: 'duplicate',
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('already_exists')
  })

  it('should reject invalid request', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 'invalid',
        handle: '',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_request')
  })

  it('should reject unauthenticated request', async () => {
    const res = await request(app).post('/api/watchlist').send({
      platformId: 1,
      handle: 'testhandle',
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})

describe('PATCH /api/watchlist/:id', () => {
  it('should update watchlist item', async () => {
    const createRes = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 1,
        handle: 'updatehandle',
        tags: 'old',
        notes: 'old notes',
      })

    const itemId = createRes.body.watchlistItem.id

    const res = await request(app)
      .patch(`/api/watchlist/${itemId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: 'paused',
        tags: 'new',
        notes: 'new notes',
      })

    expect(res.status).toBe(200)
    expect(res.body.watchlistItem.status).toBe('paused')
    expect(res.body.watchlistItem.tags).toBe('new')
    expect(res.body.watchlistItem.notes).toBe('new notes')
  })

  it('should reject update for non-existent item', async () => {
    const res = await request(app)
      .patch('/api/watchlist/99999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tags: 'new',
      })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })
})

describe('DELETE /api/watchlist/:id', () => {
  it('should delete a watchlist item', async () => {
    const createRes = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 1,
        handle: 'deletehandle',
      })

    const itemId = createRes.body.watchlistItem.id

    const res = await request(app)
      .delete(`/api/watchlist/${itemId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()

    const getRes = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(getRes.body.watchlist).toHaveLength(0)
  })

  it('should reject delete for non-existent item', async () => {
    const res = await request(app)
      .delete('/api/watchlist/99999')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })
})
