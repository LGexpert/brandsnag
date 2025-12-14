
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { createApiClient } from './lib/api/client'
import { createAuthStore } from './lib/auth/authStore'
import { createThemeStore } from './lib/theme/themeStore'
import { router } from './router'

import './styles.css'

const queryClient = new QueryClient()
const auth = createAuthStore()
const theme = createThemeStore()

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const api = createApiClient({
  baseUrl: apiUrl,
  getAccessToken: () => auth.getSnapshot().accessToken,
  getRefreshToken: () => auth.getSnapshot().refreshToken,
  onSetAccessToken: (accessToken) => auth.setAccessToken(accessToken),
  onAuthFailure: () => {
    auth.clear()
    queryClient.removeQueries()
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient, api, auth, theme }} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
