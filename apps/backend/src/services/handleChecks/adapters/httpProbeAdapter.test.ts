import { describe, expect, it, vi } from 'vitest'

import { MemoryCache } from '../cache'

import { HttpProbeAdapter } from './httpProbeAdapter'

describe('HttpProbeAdapter', () => {
  it('treats 404 as available', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 404 }))

    const adapter = new HttpProbeAdapter({
      platformKey: 'x',
      profileUrlTemplate: 'https://x.com/{handle}',
      cacheTtlMs: 60_000,
      timeoutMs: 1_000,
      fetchFn,
    })

    const res = await adapter.check('somehandle')

    expect(res.status).toBe('available')
    expect(res.profileUrl).toBe('https://x.com/somehandle')
    expect(res.errorMessage).toBeNull()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('treats 200 as taken', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 200 }))

    const adapter = new HttpProbeAdapter({
      platformKey: 'instagram',
      profileUrlTemplate: 'https://instagram.com/{handle}',
      cacheTtlMs: 60_000,
      timeoutMs: 1_000,
      fetchFn,
    })

    const res = await adapter.check('somehandle')

    expect(res.status).toBe('taken')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('uses cache when provided', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 404 }))
    const cache = new MemoryCache()

    const adapter = new HttpProbeAdapter({
      platformKey: 'reddit',
      profileUrlTemplate: 'https://reddit.com/u/{handle}',
      cache,
      cacheTtlMs: 60_000,
      timeoutMs: 1_000,
      fetchFn,
    })

    const first = await adapter.check('somehandle')
    const second = await adapter.check('somehandle')

    expect(first.status).toBe('available')
    expect(second.status).toBe('available')
    expect(second.cached).toBe(true)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
