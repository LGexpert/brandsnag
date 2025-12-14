import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { LogOut, Menu, Moon, Sun, User } from 'lucide-react'

import { Button } from './components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { useAuth } from './lib/auth/authStore'
import type { AppRouterContext } from './lib/context'
import { useTheme } from './lib/theme/themeStore'
import { cn } from './lib/cn'
import { DashboardPage } from './routes/dashboard'
import { HistoryPage } from './routes/history'
import { LandingPage } from './routes/landing'
import { LoginPage } from './routes/login'
import { SignupPage } from './routes/signup'
import { SuggestionsPage } from './routes/suggestions'

const rootRoute = createRootRouteWithContext<AppRouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const router = useRouter()
  const { api, auth, theme, queryClient } = router.options.context

  const authState = useAuth(auth)
  const themeState = useTheme(theme)

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.me()
      return res
    },
    enabled: Boolean(authState.accessToken),
    retry: false,
  })

  React.useEffect(() => {
    if (me.data) {
      auth.setUser(me.data)
    }
  }, [auth, me.data])

  React.useEffect(() => {
    if (!authState.accessToken) {
      auth.setUser(null)
    }
  }, [auth, authState.accessToken])

  const onLogout = async () => {
    try {
      await api.logout()
    } catch {
      // ignore
    }

    auth.clear()
    queryClient.removeQueries()
    await router.navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onSelect={() => {
                    void router.navigate({ to: '/' })
                  }}
                >
                  Checker
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void router.navigate({ to: '/suggestions' })
                  }}
                >
                  Suggestions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void router.navigate({ to: '/dashboard' })
                  }}
                >
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void router.navigate({ to: '/history' })
                  }}
                >
                  History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/" className="text-lg font-semibold tracking-tight">
              brandsnag
            </Link>

            <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
              <Link
                to="/"
                className={cn('hover:text-foreground', {
                  'text-foreground': router.state.location.pathname === '/',
                })}
              >
                Checker
              </Link>
              <Link to="/suggestions" className="hover:text-foreground">
                Suggestions
              </Link>
              <Link to="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link to="/history" className="hover:text-foreground">
                History
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => theme.toggle()}
              aria-label="Toggle theme"
            >
              {themeState.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {authState.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{authState.user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void onLogout()
                    }}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Outlet />
      </main>

      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </div>
  )
}

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'login',
  component: LoginPage,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'signup',
  component: SignupPage,
})

const suggestionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'suggestions',
  component: SuggestionsPage,
})

function requireAuth({ context }: { context: AppRouterContext }) {
  const { accessToken } = context.auth.getSnapshot()
  if (!accessToken) {
    throw redirect({ to: '/login' })
  }
}

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'dashboard',
  beforeLoad: ({ context }) => requireAuth({ context }),
  component: DashboardPage,
})

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'history',
  beforeLoad: ({ context }) => requireAuth({ context }),
  component: HistoryPage,
})

export const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  signupRoute,
  suggestionsRoute,
  dashboardRoute,
  historyRoute,
])

export function createAppRouter() {
  return createRouter({
    routeTree,
    context: {} as AppRouterContext,
    defaultPreload: 'intent',
  })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
