import * as React from 'react'

import type { UsernameCheckWithPlatform } from '@acme/shared'

import { StatusBadge } from '../components/statusBadge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useHistoryInfiniteQuery } from '../lib/queries/history'

function formatDay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function HistoryPage() {
  const history = useHistoryInfiniteQuery(30)

  const items = React.useMemo(() => {
    const all: UsernameCheckWithPlatform[] = []
    for (const p of history.data?.pages ?? []) {
      all.push(...p.history)
    }
    return all
  }, [history.data?.pages])

  const grouped = React.useMemo(() => {
    const map = new Map<string, UsernameCheckWithPlatform[]>()
    for (const item of items) {
      const dayKey = item.checkedAt.slice(0, 10)
      const arr = map.get(dayKey) ?? []
      arr.push(item)
      map.set(dayKey, arr)
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [items])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-muted-foreground">Your recent checks, grouped by date.</p>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No history yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Run a few checks while logged in.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayItems]) => (
            <div key={day} className="space-y-3">
              <h2 className="text-lg font-semibold">{formatDay(day)}</h2>
              <div className="grid gap-2">
                {dayItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        <div>
                          <div className="font-medium">
                            {item.platform.name} · <span className="font-mono">{item.handle}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(item.checkedAt).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {item.responseMs ? ` · ${item.responseMs}ms` : ''}
                          </div>
                        </div>
                      </div>
                      {item.profileUrl ? (
                        <a
                          href={item.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline"
                        >
                          View
                        </a>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => history.fetchNextPage()}
          disabled={!history.hasNextPage || history.isFetchingNextPage}
        >
          {history.isFetchingNextPage ? 'Loading…' : history.hasNextPage ? 'Load more' : 'End'}
        </Button>
      </div>
    </div>
  )
}
