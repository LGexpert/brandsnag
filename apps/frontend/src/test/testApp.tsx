import * as React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
  type Router,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'

import type { AppRouterContext } from '../lib/context'
import { createAuthStore } from '../lib/auth/authStore'
import { createThemeStore } from '../lib/theme/themeStore'
import { routeTree } from '../router'

export function renderApp(args: {
  initialPath?: string
  api: AppRouterContext['api']
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const auth = createAuthStore()
  auth.clear()

  const theme = createThemeStore()

  const router: Router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [args.initialPath ?? '/'] }),
    context: { queryClient, api: args.api, auth, theme },
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...view, router, queryClient, auth }
}
