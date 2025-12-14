import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from './app'

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = createApp()

    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.timestamp).toBe('string')
  })
})
