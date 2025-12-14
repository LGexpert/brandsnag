import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

type ThemeState = {
  theme: Theme
}

export type ThemeStore = {
  getSnapshot: () => ThemeState
  subscribe: (listener: () => void) => () => void
  toggle: () => void
  setTheme: (theme: Theme) => void
}

const THEME_KEY = 'acme.theme'

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function createThemeStore(): ThemeStore {
  let state: ThemeState = { theme: getPreferredTheme() }
  applyTheme(state.theme)

  const listeners = new Set<() => void>()

  const emit = () => {
    for (const l of listeners) l()
  }

  const setTheme = (theme: Theme) => {
    state = { theme }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, theme)
    }
    applyTheme(theme)
    emit()
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setTheme,
    toggle: () => {
      setTheme(state.theme === 'dark' ? 'light' : 'dark')
    },
  }
}

export function useTheme(store: ThemeStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
