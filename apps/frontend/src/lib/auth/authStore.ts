import { useSyncExternalStore } from 'react'

import type { AuthUser } from '@acme/shared'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
}

export type AuthStore = {
  getSnapshot: () => AuthState
  subscribe: (listener: () => void) => () => void
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setUser: (user: AuthUser | null) => void
  clear: () => void
}

const ACCESS_TOKEN_KEY = 'acme.accessToken'
const REFRESH_TOKEN_KEY = 'acme.refreshToken'

export function createAuthStore(): AuthStore {
  let state: AuthState = {
    accessToken: typeof localStorage !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null,
    refreshToken:
      typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null,
    user: null,
  }

  const listeners = new Set<() => void>()

  const emit = () => {
    for (const l of listeners) l()
  }

  const persistTokens = (tokens: { accessToken: string | null; refreshToken: string | null }) => {
    if (typeof localStorage === 'undefined') return

    if (tokens.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }

    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setTokens: (tokens) => {
      state = { ...state, ...tokens }
      persistTokens(tokens)
      emit()
    },
    setAccessToken: (accessToken) => {
      state = { ...state, accessToken }
      persistTokens({ accessToken, refreshToken: state.refreshToken })
      emit()
    },
    setUser: (user) => {
      state = { ...state, user }
      emit()
    },
    clear: () => {
      state = { accessToken: null, refreshToken: null, user: null }
      persistTokens(state)
      emit()
    },
  }
}

export function useAuth(store: AuthStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
