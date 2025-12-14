import type {
  AuthResponse,
  BulkHandleCheckResponse,
  FavoriteCreateResponse,
  FavoriteUpdateResponse,
  FavoritesListResponse,
  HandleCheckResponse,
  HistoryListResponse,
  LoginInput,
  MeResponse,
  PlatformListResponse,
  RefreshResponse,
  SignupInput,
  WatchlistCreateResponse,
  WatchlistListResponse,
  WatchlistUpdateResponse,
} from '@acme/shared'

import { readSseStream } from './sse'

export type ApiClientConfig = {
  baseUrl: string
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  onSetAccessToken: (accessToken: string | null) => void
  onAuthFailure: () => void
}

function safeJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>
}

async function jsonOrText(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as unknown
    return JSON.stringify(data)
  } catch {
    return await res.text()
  }
}

export function createApiClient(config: ApiClientConfig) {
  const fetchJson = async <T>(
    path: string,
    init: RequestInit & { json?: unknown; skipAuthRetry?: boolean } = {},
  ): Promise<T> => {
    const url = `${config.baseUrl}${path}`

    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')

    if (init.json !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    const accessToken = config.getAccessToken()
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const res = await fetch(url, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    })

    if (res.status === 401 && !init.skipAuthRetry) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return await fetchJson<T>(path, { ...init, skipAuthRetry: true })
      }

      config.onAuthFailure()
    }

    if (!res.ok) {
      const details = await jsonOrText(res)
      throw new Error(`Request failed: ${res.status} ${details}`)
    }

    return safeJson<T>(res)
  }

  const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = config.getRefreshToken()
    if (!refreshToken) return null

    try {
      const payload = await fetchJson<RefreshResponse>('/api/auth/refresh', {
        method: 'POST',
        json: { refreshToken },
        skipAuthRetry: true,
      })

      config.onSetAccessToken(payload.accessToken)
      return payload.accessToken
    } catch {
      return null
    }
  }

  const postSse = async <TDone>(args: {
    path: string
    json: unknown
    onResult: (args: { handle: string; result: unknown }) => void
    onMeta?: (meta: unknown) => void
    signal?: AbortSignal
  }): Promise<TDone> => {
    const url = `${config.baseUrl}${args.path}`

    const tryOnce = async (skipAuthRetry: boolean): Promise<TDone> => {
      const headers = new Headers()
      headers.set('Accept', 'text/event-stream')
      headers.set('Content-Type', 'application/json')

      const accessToken = config.getAccessToken()
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(args.json),
        signal: args.signal,
      })

      if (res.status === 401 && !skipAuthRetry) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          return await tryOnce(true)
        }

        config.onAuthFailure()
      }

      if (!res.ok) {
        const details = await jsonOrText(res)
        throw new Error(`Request failed: ${res.status} ${details}`)
      }

      let donePayload: TDone | null = null
      let err: Error | null = null

      await readSseStream({
        response: res,
        signal: args.signal,
        onMessage: (msg) => {
          if (msg.event === 'meta') {
            args.onMeta?.(JSON.parse(msg.data) as unknown)
          } else if (msg.event === 'result') {
            args.onResult(JSON.parse(msg.data) as { handle: string; result: unknown })
          } else if (msg.event === 'done') {
            donePayload = JSON.parse(msg.data) as TDone
          } else if (msg.event === 'error') {
            const payload = JSON.parse(msg.data) as { message?: string }
            err = new Error(payload.message ?? 'Unknown error')
          }
        },
      })

      if (err) throw err
      if (!donePayload) throw new Error('Missing done payload')
      return donePayload
    }

    return await tryOnce(false)
  }

  return {
    fetchJson,

    getPlatforms: async () => {
      return await fetchJson<PlatformListResponse>('/api/platforms')
    },

    signup: async (input: SignupInput) => {
      return await fetchJson<AuthResponse>('/api/auth/signup', { method: 'POST', json: input })
    },

    login: async (input: LoginInput) => {
      return await fetchJson<AuthResponse>('/api/auth/login', { method: 'POST', json: input })
    },

    logout: async () => {
      return await fetchJson<{ message: string }>('/api/auth/logout', { method: 'POST' })
    },

    me: async () => {
      return await fetchJson<MeResponse>('/api/auth/me')
    },

    checkHandleSse: async (args: {
      handle: string
      platformKeys?: string[]
      signal?: AbortSignal
      onPartial: (args: { handle: string; result: HandleCheckResponse['results'][number] }) => void
      onMeta?: (meta: unknown) => void
    }) => {
      return await postSse<HandleCheckResponse>({
        path: '/api/check?stream=1',
        json: { handle: args.handle, platformKeys: args.platformKeys },
        signal: args.signal,
        onMeta: args.onMeta,
        onResult: ({ handle, result }) => {
          args.onPartial({ handle, result: result as HandleCheckResponse['results'][number] })
        },
      })
    },

    checkBulkSse: async (args: {
      handles: string[]
      platformKeys?: string[]
      signal?: AbortSignal
      onPartial: (args: { handle: string; result: HandleCheckResponse['results'][number] }) => void
      onMeta?: (meta: unknown) => void
    }) => {
      return await postSse<BulkHandleCheckResponse>({
        path: '/api/check/bulk?stream=1',
        json: { handles: args.handles, platformKeys: args.platformKeys },
        signal: args.signal,
        onMeta: args.onMeta,
        onResult: ({ handle, result }) => {
          args.onPartial({ handle, result: result as HandleCheckResponse['results'][number] })
        },
      })
    },

    listFavorites: async () => {
      return await fetchJson<FavoritesListResponse>('/api/favorites')
    },

    addFavorite: async (input: {
      platformId: number
      handle: string
      tags?: string
      notes?: string
    }) => {
      return await fetchJson<FavoriteCreateResponse>('/api/favorites', {
        method: 'POST',
        json: input,
      })
    },

    updateFavorite: async (id: number, input: { tags?: string; notes?: string }) => {
      return await fetchJson<FavoriteUpdateResponse>(`/api/favorites/${id}`, {
        method: 'PATCH',
        json: input,
      })
    },

    deleteFavorite: async (id: number) => {
      return await fetchJson<{ message: string }>(`/api/favorites/${id}`, {
        method: 'DELETE',
      })
    },

    listWatchlist: async () => {
      return await fetchJson<WatchlistListResponse>('/api/watchlist')
    },

    addWatchlistItem: async (input: {
      platformId: number
      handle: string
      tags?: string
      notes?: string
    }) => {
      return await fetchJson<WatchlistCreateResponse>('/api/watchlist', {
        method: 'POST',
        json: input,
      })
    },

    updateWatchlistItem: async (
      id: number,
      input: { status?: WatchlistUpdateResponse['watchlistItem']['status']; tags?: string; notes?: string },
    ) => {
      return await fetchJson<WatchlistUpdateResponse>(`/api/watchlist/${id}`, {
        method: 'PATCH',
        json: input,
      })
    },

    deleteWatchlistItem: async (id: number) => {
      return await fetchJson<{ message: string }>(`/api/watchlist/${id}`, {
        method: 'DELETE',
      })
    },

    listHistory: async (args: { limit: number; offset: number }) => {
      const qs = new URLSearchParams({ limit: String(args.limit), offset: String(args.offset) })
      return await fetchJson<HistoryListResponse>(`/api/history?${qs.toString()}`)
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
