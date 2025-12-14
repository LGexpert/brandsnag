import * as React from 'react'

import type { BulkHandleCheckResponse, HandleCheckResponse } from '@acme/shared'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAuth } from '../lib/auth/authStore'
import { useAppContext } from '../lib/useAppContext'
import { useAddWatchlistMutation } from '../lib/queries/watchlist'

export function SuggestionsPage() {
  const { auth, queryClient } = useAppContext()
  const navigate = useNavigate()
  const addWatch = useAddWatchlistMutation()
  const authState = useAuth(auth)

  const lastCheck = useQuery({
    queryKey: ['lastCheck'],
    queryFn: async () => null as HandleCheckResponse | null,
    enabled: false,
  })

  const lastBulk = useQuery({
    queryKey: ['lastBulk'],
    queryFn: async () => null as BulkHandleCheckResponse | null,
    enabled: false,
  })

  const suggestions = React.useMemo(() => {
    const groups: Array<{
      platformId: number | null
      platformName: string
      platformKey: string
      handle: string
      suggestions: string[]
    }> = []

    if (lastCheck.data) {
      for (const r of lastCheck.data.results) {
        if (r.status === 'taken' && r.suggestions?.length) {
          groups.push({
            platformId: r.platformId ?? null,
            platformName: r.platformName,
            platformKey: r.platformKey,
            handle: lastCheck.data.handle,
            suggestions: r.suggestions,
          })
        }
      }
    }

    if (!groups.length && lastBulk.data) {
      for (const res of lastBulk.data.results) {
        for (const r of res.results) {
          if (r.status === 'taken' && r.suggestions?.length) {
            groups.push({
              platformId: r.platformId ?? null,
              platformName: r.platformName,
              platformKey: r.platformKey,
              handle: res.handle,
              suggestions: r.suggestions,
            })
          }
        }
      }
    }

    return groups
  }, [lastBulk.data, lastCheck.data])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Suggestions</h1>
        <p className="text-muted-foreground">
          Alternatives generated when a handle is already taken.
        </p>
        <div>
          <Button asChild variant="link" className="px-0">
            <Link to="/">Back to checker</Link>
          </Button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No suggestions yet</CardTitle>
            <CardDescription>
              Run a check first — suggestions appear when a platform reports “Taken”.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((g) => (
            <Card key={`${g.handle}-${g.platformKey}`}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {g.platformName} · @{g.handle}
                </CardTitle>
                <CardDescription>Try these variants</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {g.suggestions.map((s) => (
                  <div key={s} className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <span className="font-mono text-sm">{s}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        queryClient.setQueryData(['prefillHandle'], s)
                        void navigate({ to: '/' })
                      }}
                    >
                      Check
                    </Button>
                    {authState.accessToken && g.platformId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          addWatch.mutate({
                            platformId: g.platformId!,
                            handle: s,
                          })
                        }
                      >
                        Watch
                      </Button>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
