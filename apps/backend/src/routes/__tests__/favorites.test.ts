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
    email: 'favorites@example.com',
    password: 'securePassword123',
  })

  accessToken = signupRes.body.accessToken
})

describe('GET /api/favorites', () => {
  it('should return empty array for new user', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.favorites).toEqual([])
  })

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/favorites')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})

describe('POST /api/favorites', () => {
  it('should add a favorite', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 1,
        handle: 'testhandle',
        tags: 'tag1,tag2',
        notes: 'Test notes',
      })

    expect(res.status).toBe(201)
    expect(res.body.favorite).toBeDefined()
    expect(res.body.favorite.handle).toBe('testhandle')
    expect(res.body.favorite.tags).toBe('tag1,tag2')
    expect(res.body.favorite.notes).toBe('Test notes')
  })

  it('should reject duplicate favorite', async () => {
    await request(app).post('/api/favorites').set('Authorization', `Bearer ${accessToken}`).send({
      platformId: 1,
      handle: 'duplicate',
    })

    const res = await request(app)
      .post('/api/favorites')
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
      .post('/api/favorites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 'invalid',
        handle: '',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_request')
  })

  it('should reject unauthenticated request', async () => {
    const res = await request(app).post('/api/favorites').send({
      platformId: 1,
      handle: 'testhandle',
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})

describe('PATCH /api/favorites/:id', () => {
  it('should update favorite tags and notes', async () => {
    const createRes = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 1,
        handle: 'updatehandle',
        tags: 'old',
        notes: 'old notes',
      })

    const favoriteId = createRes.body.favorite.id

    const res = await request(app)
      .patch(`/api/favorites/${favoriteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tags: 'new',
        notes: 'new notes',
      })

    expect(res.status).toBe(200)
    expect(res.body.favorite.tags).toBe('new')
    expect(res.body.favorite.notes).toBe('new notes')
  })

  it('should reject update for non-existent favorite', async () => {
    const res = await request(app)
      .patch('/api/favorites/99999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tags: 'new',
      })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })
})

describe('DELETE /api/favorites/:id', () => {
  it('should delete a favorite', async () => {
    const createRes = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        platformId: 1,
        handle: 'deletehandle',
      })

    const favoriteId = createRes.body.favorite.id

    const res = await request(app)
      .delete(`/api/favorites/${favoriteId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()

    const getRes = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(getRes.body.favorites).toHaveLength(0)
  })

  it('should reject delete for non-existent favorite', async () => {
    const res = await request(app)
      .delete('/api/favorites/99999')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })
})
