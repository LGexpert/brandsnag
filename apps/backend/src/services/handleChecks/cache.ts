export type CacheEntry<T> = {
  value: T
  expiresAtMs: number
}

export interface CacheStore {
  get<T>(key: string): T | null
  set<T>(key: string, value: T, ttlMs: number): void
}

export class MemoryCache implements CacheStore {
  private readonly map = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | null {
    const entry = this.map.get(key)
    if (!entry) return null
    if (Date.now() >= entry.expiresAtMs) {
      this.map.delete(key)
      return null
    }

    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number) {
    this.map.set(key, {
      value,
      expiresAtMs: Date.now() + ttlMs,
    })
  }
}
