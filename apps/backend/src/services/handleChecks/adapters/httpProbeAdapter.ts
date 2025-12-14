import type { UsernameCheckStatus } from '@acme/shared'

import type { CacheStore } from '../cache'

import type { AdapterCheckResult, HandleCheckAdapter } from './types'

export type HttpProbeAdapterOptions = {
  platformKey: string
  profileUrlTemplate: string
  cache?: CacheStore
  cacheTtlMs: number
  timeoutMs: number
  userAgent?: string
  interpretStatus?: (httpStatus: number) => UsernameCheckStatus
  fetchFn?: typeof fetch
}

const defaultInterpretStatus = (httpStatus: number): UsernameCheckStatus => {
  if (httpStatus === 404) return 'available'
  if ([200, 301, 302].includes(httpStatus)) return 'taken'
  if (httpStatus >= 400 && httpStatus < 500) return 'unknown'
  if (httpStatus >= 500) return 'unknown'
  return 'unknown'
}

export class HttpProbeAdapter implements HandleCheckAdapter {
  private readonly opts: HttpProbeAdapterOptions

  constructor(opts: HttpProbeAdapterOptions) {
    this.opts = opts
  }

  async check(handle: string): Promise<AdapterCheckResult> {
    const profileUrl = this.opts.profileUrlTemplate.replace('{handle}', handle)
    const cacheKey = `probe:${this.opts.platformKey}:${handle}`

    const cached = this.opts.cache?.get<AdapterCheckResult>(cacheKey)
    if (cached) {
      return {
        ...cached,
        cached: true,
        checkedAt:
          cached.checkedAt instanceof Date
            ? new Date(cached.checkedAt.getTime())
            : new Date(cached.checkedAt),
      }
    }

    const startedAt = Date.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs)

    try {
      const fetchFn = this.opts.fetchFn ?? fetch

      const res = await fetchFn(profileUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            this.opts.userAgent ??
            'Mozilla/5.0 (compatible; AcmeHandleCheck/1.0; +https://example.com)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      const responseMs = Date.now() - startedAt
      const interpret = this.opts.interpretStatus ?? defaultInterpretStatus
      const status = interpret(res.status)

      const result: AdapterCheckResult = {
        status,
        profileUrl,
        errorMessage: null,
        responseMs,
        checkedAt: new Date(),
      }

      this.opts.cache?.set(cacheKey, result, this.opts.cacheTtlMs)

      return result
    } catch (err) {
      const responseMs = Date.now() - startedAt
      const errorMessage = err instanceof Error ? err.message : 'unknown error'

      const result: AdapterCheckResult = {
        status: 'error',
        profileUrl,
        errorMessage,
        responseMs,
        checkedAt: new Date(),
      }

      this.opts.cache?.set(cacheKey, result, Math.min(this.opts.cacheTtlMs, 5_000))

      return result
    } finally {
      clearTimeout(timeout)
    }
  }
}
