import * as React from 'react'

import type { HandleCheckResponse } from '@acme/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { BulkCheckerDialog } from '../components/bulkCheckerDialog'
import { StatusBadge } from '../components/statusBadge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Spinner } from '../components/ui/spinner'
import { useAuth } from '../lib/auth/authStore'
import { useAppContext } from '../lib/useAppContext'
import { DEFAULT_PLATFORMS } from '../lib/platforms'
import { useAddFavoriteMutation } from '../lib/queries/favorites'
import { useAddWatchlistMutation } from '../lib/queries/watchlist'

const schema = z.object({
  handle: z
    .string()
    .trim()
    .min(1, 'Handle is required')
    .max(64)
    .regex(/^[A-Za-z0-9_.-]+$/, 'Only letters, numbers, underscore, dot, dash'),
})

type FormValues = z.infer<typeof schema>

type PlatformResult = HandleCheckResponse['results'][number]

type ResultsState = {
  handle: string
  resultsByPlatformKey: Record<string, PlatformResult>
}

export function LandingPage() {
  const { api, auth, queryClient } = useAppContext()
  const navigate = useNavigate()

  const authState = useAuth(auth)

  const prefill = useQuery({
    queryKey: ['prefillHandle'],
    queryFn: async () => null as string | null,
    enabled: false,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { handle: '' },
  })

  const [results, setResults] = React.useState<ResultsState | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  const addFavorite = useAddFavoriteMutation()
  const addWatch = useAddWatchlistMutation()

  const checkMutation = useMutation({
    mutationFn: async (handle: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setResults({ handle, resultsByPlatformKey: {} })

      const res = await api.checkHandleSse({
        handle,
        signal: controller.signal,
        onPartial: ({ result }) => {
          setResults((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              resultsByPlatformKey: {
                ...prev.resultsByPlatformKey,
                [result.platformKey]: result,
              },
            }
          })
        },
      })

      return res
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['lastCheck'], data)
    },
  })

  React.useEffect(() => {
    if (prefill.data) {
      form.setValue('handle', prefill.data)
      void checkMutation.mutateAsync(prefill.data)
      queryClient.setQueryData(['prefillHandle'], null)
    }
  }, [checkMutation, form, prefill.data, queryClient])

  const onSubmit = form.handleSubmit(async (values) => {
    await checkMutation.mutateAsync(values.handle)
  })

  const platforms = DEFAULT_PLATFORMS
  const currentResults = results?.resultsByPlatformKey ?? {}

  const anySuggestions = Object.values(currentResults).some(
    (r) => r.status === 'taken' && (r.suggestions?.length ?? 0) > 0,
  )

  return (
    <div className="space-y-12">
      <section className="pt-10">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Snag your handle everywhere.
          </h1>
          <p className="text-pretty text-muted-foreground">
            Check availability across the major platforms in seconds — with live updates and bulk
            checking.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Handle checker</CardTitle>
              <CardDescription>Try a name once. Get the grid instantly.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      placeholder="brandname"
                      autoComplete="off"
                      {...form.register('handle')}
                    />
                    {form.formState.errors.handle ? (
                      <p className="mt-1 text-sm text-destructive">
                        {form.formState.errors.handle.message}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={checkMutation.isPending}>
                    {checkMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="h-4 w-4" /> Checking
                      </span>
                    ) : (
                      'Check'
                    )}
                  </Button>
                  <BulkCheckerDialog />
                </div>

                {anySuggestions ? (
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => navigate({ to: '/suggestions' })}
                    >
                      View suggestions
                    </Button>
                  </div>
                ) : null}

                {!authState.accessToken ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Want to save favorites and watchlists?{' '}
                    <Link to="/signup" className="underline">
                      Create an account
                    </Link>
                    .
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {results ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Results for “{results.handle}”</h2>
            <Button
              variant="ghost"
              onClick={() => abortRef.current?.abort()}
              disabled={!checkMutation.isPending}
            >
              Cancel
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((p) => {
              const r = currentResults[p.key]
              const status = r?.status ?? (checkMutation.isPending ? 'pending' : 'unknown')

              return (
                <Card key={p.key} className="overflow-hidden">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{r?.platformName ?? p.name}</CardTitle>
                      <StatusBadge status={status} />
                    </div>
                    <CardDescription className="line-clamp-1">@{results.handle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {r?.profileUrl ? (
                      <a
                        href={r.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm underline"
                      >
                        Open profile
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">No profile URL</p>
                    )}

                    {r?.status === 'taken' && r.suggestions?.length ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: '/suggestions' })}
                      >
                        Suggestions
                      </Button>
                    ) : null}

                    {authState.accessToken && r?.platformId ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            addFavorite.mutate({
                              platformId: r.platformId!,
                              handle: results.handle,
                            })
                          }
                        >
                          Favorite
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            addWatch.mutate({
                              platformId: r.platformId!,
                              handle: results.handle,
                            })
                          }
                        >
                          Watch
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
