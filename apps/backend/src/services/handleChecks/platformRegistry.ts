import { HttpProbeAdapter } from './adapters/httpProbeAdapter'
import type { HandleCheckAdapter } from './adapters/types'
import { MemoryCache } from './cache'
import { createConcurrencyLimiter, createRpsLimiter } from './limiters'
import { DEFAULT_PLATFORM_DEFINITIONS } from './platformDefinitions'
import type { PlatformDefinition, PlatformKey } from './types'

export type PlatformAdapterConfig = {
  definition: PlatformDefinition
  adapter: HandleCheckAdapter
}

export type PlatformRuntimeConfig = {
  cacheTtlMs: number
  timeoutMs: number
  concurrency: number
  maxRps: number
}

export class PlatformAdapterRegistry {
  private readonly adapters = new Map<PlatformKey, PlatformAdapterConfig>()

  private readonly limiterByPlatformKey = new Map<PlatformKey, ReturnType<typeof createConcurrencyLimiter>>()
  private readonly rpsLimiterByPlatformKey = new Map<PlatformKey, ReturnType<typeof createRpsLimiter>>()

  constructor(private readonly runtime: PlatformRuntimeConfig) {
    const cache = new MemoryCache()

    for (const def of DEFAULT_PLATFORM_DEFINITIONS) {
      this.register(def, {
        adapter: new HttpProbeAdapter({
          platformKey: def.key,
          profileUrlTemplate: def.profileUrlTemplate,
          cache,
          cacheTtlMs: runtime.cacheTtlMs,
          timeoutMs: runtime.timeoutMs,
        }),
      })
    }
  }

  register(definition: PlatformDefinition, opts?: { adapter?: HandleCheckAdapter }) {
    const adapter =
      opts?.adapter ??
      new HttpProbeAdapter({
        platformKey: definition.key,
        profileUrlTemplate: definition.profileUrlTemplate,
        cache: new MemoryCache(),
        cacheTtlMs: this.runtime.cacheTtlMs,
        timeoutMs: this.runtime.timeoutMs,
      })

    this.adapters.set(definition.key, {
      definition,
      adapter,
    })
  }

  getDefinition(platformKey: PlatformKey): PlatformDefinition | null {
    return this.adapters.get(platformKey)?.definition ?? null
  }

  getAdapter(platformKey: PlatformKey): HandleCheckAdapter | null {
    return this.adapters.get(platformKey)?.adapter ?? null
  }

  async runLimited<T>(platformKey: PlatformKey, fn: () => Promise<T>): Promise<T> {
    const limiter = this.getOrCreateLimiter(platformKey)
    const rpsLimiter = this.getOrCreateRpsLimiter(platformKey)

    return await limiter.run(async () => {
      await rpsLimiter.waitTurn()
      return await fn()
    })
  }

  private getOrCreateLimiter(platformKey: PlatformKey) {
    const existing = this.limiterByPlatformKey.get(platformKey)
    if (existing) return existing

    const limiter = createConcurrencyLimiter(this.runtime.concurrency)
    this.limiterByPlatformKey.set(platformKey, limiter)
    return limiter
  }

  private getOrCreateRpsLimiter(platformKey: PlatformKey) {
    const existing = this.rpsLimiterByPlatformKey.get(platformKey)
    if (existing) return existing

    const limiter = createRpsLimiter(this.runtime.maxRps)
    this.rpsLimiterByPlatformKey.set(platformKey, limiter)
    return limiter
  }
}
