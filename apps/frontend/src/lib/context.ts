import type { QueryClient } from '@tanstack/react-query'

import type { ApiClient } from './api/client'
import type { AuthStore } from './auth/authStore'
import type { ThemeStore } from './theme/themeStore'

export type AppRouterContext = {
  queryClient: QueryClient
  api: ApiClient
  auth: AuthStore
  theme: ThemeStore
}
