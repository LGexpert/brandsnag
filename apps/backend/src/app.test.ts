import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApp } from './app'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = createApp()

    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.timestamp).toBe('string')
  })
})

describe('POST /api/check', () => {
  it('returns platform results', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

    const app = createApp()

    const res = await request(app)
      .post('/api/check')
      .send({
        handle: 'somehandle',
        platformKeys: ['x'],
      })

    expect(res.status).toBe(200)
    expect(res.body.handle).toBe('somehandle')
    expect(Array.isArray(res.body.results)).toBe(true)
    expect(res.body.results).toHaveLength(1)
    expect(res.body.results[0].platformKey).toBe('x')
    expect(res.body.results[0].status).toBe('available')
  })

  it('validates request body', async () => {
    const app = createApp()

    const res = await request(app).post('/api/check').send({ handle: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_request')
  })
})
