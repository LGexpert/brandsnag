import { usernameCheckStatusSchema } from '@acme/shared'
import { inArray } from 'drizzle-orm'

import { getDb } from '../../db/client'
import { platforms, suggestedNames, usernameChecks } from '../../db/schema'
import { logger } from '../../logger'

import { HttpProbeAdapter } from './adapters/httpProbeAdapter'
import { MemoryCache } from './cache'
import { createConcurrencyLimiter } from './limiters'
import { DEFAULT_PLATFORM_DEFINITIONS, DEFAULT_PLATFORM_KEYS } from './platformDefinitions'
import { PlatformAdapterRegistry } from './platformRegistry'
import { generateHandleSuggestions } from './suggestions'
import type { BulkHandleCheckResponse, HandleCheckResponse, PlatformCheckResult, PlatformDefinition } from './types'

export type HandleCheckServiceConfig = {
  cacheTtlMs: number
  timeoutMs: number
  perPlatformConcurrency: number
  perPlatformMaxRps: number
  bulkMaxConcurrency: number
}

export type PartialResultCallback = (args: {
  handle: string
  result: PlatformCheckResult
}) => void

export class HandleCheckService {
  private readonly registry: PlatformAdapterRegistry
  private readonly bulkLimiter: ReturnType<typeof createConcurrencyLimiter>

  constructor(private readonly config: HandleCheckServiceConfig) {
    this.registry = new PlatformAdapterRegistry({
      cacheTtlMs: config.cacheTtlMs,
      timeoutMs: config.timeoutMs,
      concurrency: config.perPlatformConcurrency,
      maxRps: config.perPlatformMaxRps,
    })

    this.bulkLimiter = createConcurrencyLimiter(config.bulkMaxConcurrency)
  }

  async checkHandle(args: {
    handle: string
    platformKeys?: string[]
    onPartial?: PartialResultCallback
  }): Promise<HandleCheckResponse> {
    const handle = args.handle.trim()
    const platformKeys = (args.platformKeys?.length ? args.platformKeys : DEFAULT_PLATFORM_KEYS).slice()

    const requestedAt = new Date().toISOString()

    const definitions = await this.ensurePlatforms(platformKeys)

    const results = await Promise.all(
      platformKeys.map(async (platformKey): Promise<PlatformCheckResult> => {
        const def = definitions.get(platformKey)

        const platformName = def?.name ?? platformKey

        if (!def) {
          const result: PlatformCheckResult = {
            platformKey,
            platformName,
            status: 'unknown',
            checkedAt: new Date().toISOString(),
            profileUrl: null,
            responseMs: null,
            errorMessage: 'platform not configured',
          }

          args.onPartial?.({ handle, result })
          return result
        }

        const handleRegex = def.handleRegex ? new RegExp(def.handleRegex) : null
        if (handleRegex && !handleRegex.test(handle)) {
          const result: PlatformCheckResult = {
            platformKey,
            platformName: def.name,
            status: 'invalid',
            checkedAt: new Date().toISOString(),
            profileUrl: def.profileUrlTemplate.replace('{handle}', handle),
            responseMs: null,
            errorMessage: 'handle does not match platform rules',
          }

          args.onPartial?.({ handle, result })

          void this.persistResult({
            handle,
            platformKey,
            platformId: def.platformId ?? null,
            result,
          })

          return result
        }

        const adapter = await this.getOrCreateAdapter(platformKey, def)
        if (!adapter) {
          const result: PlatformCheckResult = {
            platformKey,
            platformName: def.name,
            status: 'unknown',
            checkedAt: new Date().toISOString(),
            profileUrl: def.profileUrlTemplate.replace('{handle}', handle),
            responseMs: null,
            errorMessage: 'no adapter registered',
          }

          args.onPartial?.({ handle, result })
          return result
        }

        const adapterResult = await this.registry.runLimited(platformKey, () => adapter.check(handle))

        const result: PlatformCheckResult = {
          platformKey,
          platformName: def.name,
          status: usernameCheckStatusSchema.parse(adapterResult.status),
          checkedAt: adapterResult.checkedAt.toISOString(),
          profileUrl: adapterResult.profileUrl,
          responseMs: adapterResult.responseMs,
          errorMessage: adapterResult.errorMessage,
          cached: adapterResult.cached,
        }

        if (result.status === 'taken') {
          const suggestions = generateHandleSuggestions(handle)
          result.suggestions = suggestions

          void this.persistSuggestions({
            platformId: def.platformId ?? null,
            suggestions,
          })
        }

        args.onPartial?.({ handle, result })

        void this.persistResult({
          handle,
          platformKey,
          platformId: def.platformId ?? null,
          result,
        })

        return result
      }),
    )

    return {
      handle,
      requestedAt,
      results,
    }
  }

  async checkBulk(args: {
    handles: string[]
    platformKeys?: string[]
    onPartial?: PartialResultCallback
  }): Promise<BulkHandleCheckResponse> {
    const handles = args.handles.map((h) => h.trim()).filter(Boolean)
    const requestedAt = new Date().toISOString()

    const results = await Promise.all(
      handles.map(async (handle) => {
        return await this.bulkLimiter.run(async () => {
          return await this.checkHandle({
            handle,
            platformKeys: args.platformKeys,
            onPartial: args.onPartial,
          })
        })
      }),
    )

    return {
      handles,
      requestedAt,
      results,
    }
  }

  private async getOrCreateAdapter(platformKey: string, def: PlatformDefinitionWithId) {
    const existing = this.registry.getAdapter(platformKey)
    if (existing) return existing

    const profileUrlTemplate = def.profileUrlTemplate

    const cache = new MemoryCache()

    const adapter = new HttpProbeAdapter({
      platformKey,
      profileUrlTemplate,
      cache,
      cacheTtlMs: this.config.cacheTtlMs,
      timeoutMs: this.config.timeoutMs,
    })

    this.registry.register(
      {
        key: platformKey,
        name: def.name,
        baseUrl: def.baseUrl,
        profileUrlTemplate: def.profileUrlTemplate,
        handleRegex: def.handleRegex,
        sortOrder: def.sortOrder,
      },
      {
        adapter,
      },
    )

    return adapter
  }

  private async ensurePlatforms(platformKeys: string[]) {
    const keySet = new Set(platformKeys)
    const defs = new Map<string, PlatformDefinitionWithId>()

    for (const def of DEFAULT_PLATFORM_DEFINITIONS) {
      if (keySet.has(def.key)) {
        defs.set(def.key, {
          ...def,
          platformId: null,
        })
      }
    }

    const db = getDb()
    if (!db) {
      return defs
    }

    const dbRows = await db
      .select({
        id: platforms.id,
        key: platforms.key,
        name: platforms.name,
        baseUrl: platforms.baseUrl,
        profileUrlTemplate: platforms.profileUrlTemplate,
        handleRegex: platforms.handleRegex,
        sortOrder: platforms.sortOrder,
      })
      .from(platforms)
      .where(inArray(platforms.key, platformKeys))

    for (const row of dbRows) {
      defs.set(row.key, {
        key: row.key,
        name: row.name,
        baseUrl: row.baseUrl,
        profileUrlTemplate: row.profileUrlTemplate,
        handleRegex: row.handleRegex ?? undefined,
        sortOrder: row.sortOrder,
        platformId: row.id,
      })
    }

    const missing = platformKeys.filter((k) => !defs.get(k)?.platformId)

    const missingDefs: PlatformDefinition[] = DEFAULT_PLATFORM_DEFINITIONS.filter((d) => missing.includes(d.key))

    if (missingDefs.length > 0) {
      await db
        .insert(platforms)
        .values(
          missingDefs.map((d) => ({
            key: d.key,
            name: d.name,
            baseUrl: d.baseUrl,
            profileUrlTemplate: d.profileUrlTemplate,
            handleRegex: d.handleRegex,
            sortOrder: d.sortOrder,
            status: 'active' as const,
            updatedAt: new Date(),
          })),
        )
        .onConflictDoNothing({
          target: platforms.key,
        })

      const afterInsert = await db
        .select({
          id: platforms.id,
          key: platforms.key,
          name: platforms.name,
          baseUrl: platforms.baseUrl,
          profileUrlTemplate: platforms.profileUrlTemplate,
          handleRegex: platforms.handleRegex,
          sortOrder: platforms.sortOrder,
        })
        .from(platforms)
        .where(inArray(platforms.key, missingDefs.map((d) => d.key)))

      for (const row of afterInsert) {
        defs.set(row.key, {
          key: row.key,
          name: row.name,
          baseUrl: row.baseUrl,
          profileUrlTemplate: row.profileUrlTemplate,
          handleRegex: row.handleRegex ?? undefined,
          sortOrder: row.sortOrder,
          platformId: row.id,
        })
      }
    }

    return defs
  }

  private async persistResult(args: {
    handle: string
    platformKey: string
    platformId: number | null
    result: PlatformCheckResult
  }) {
    const db = getDb()
    if (!db) return
    if (!args.platformId) return

    try {
      await db.insert(usernameChecks).values({
        platformId: args.platformId,
        handle: args.handle,
        source: 'manual',
        status: args.result.status,
        profileUrl: args.result.profileUrl,
        errorMessage: args.result.errorMessage,
        responseMs: args.result.responseMs,
        checkedAt: new Date(args.result.checkedAt),
      })
    } catch (err) {
      logger.warn({ err, platformKey: args.platformKey }, 'failed to persist username check')
    }
  }

  private async persistSuggestions(args: { platformId: number | null; suggestions: string[] }) {
    const db = getDb()
    if (!db) return
    if (!args.platformId) return

    try {
      await db
        .insert(suggestedNames)
        .values(
          args.suggestions.map((handle) => ({
            platformId: args.platformId!,
            handle,
            status: 'suggested' as const,
            source: 'auto',
          })),
        )
        .onConflictDoNothing({
          target: [suggestedNames.platformId, suggestedNames.handle],
        })
    } catch (err) {
      logger.warn({ err, platformId: args.platformId }, 'failed to persist suggestions')
    }
  }
}

type PlatformDefinitionWithId = PlatformDefinition & { platformId: number | null }
