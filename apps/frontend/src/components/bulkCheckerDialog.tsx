import * as React from 'react'

import type { BulkHandleCheckResponse, HandleCheckResponse } from '@acme/shared'
import { useMutation, useQuery } from '@tanstack/react-query'

import { useAuth } from '../lib/auth/authStore'
import { useAppContext } from '../lib/useAppContext'
import { DEFAULT_PLATFORMS } from '../lib/platforms'
import { useAddFavoriteMutation } from '../lib/queries/favorites'
import { useAddWatchlistMutation } from '../lib/queries/watchlist'

import { StatusBadge } from './statusBadge'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Textarea } from './ui/textarea'

function parseHandles(input: string): string[] {
  return input
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50)
}

type Cell = HandleCheckResponse['results'][number]

type GridState = {
  handles: string[]
  resultsByHandle: Record<string, Record<string, Cell>>
}

const emptyGridState: GridState = {
  handles: [],
  resultsByHandle: {},
}

export function BulkCheckerDialog() {
  const { api, auth, queryClient } = useAppContext()
  const authState = useAuth(auth)

  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [grid, setGrid] = React.useState<GridState>(emptyGridState)

  const abortRef = React.useRef<AbortController | null>(null)

  const addFavorite = useAddFavoriteMutation()
  const addWatch = useAddWatchlistMutation()

  const lastBulk = useQuery({
    queryKey: ['lastBulk'],
    queryFn: async () => null as BulkHandleCheckResponse | null,
    enabled: false,
  })

  const bulkMutation = useMutation({
    mutationFn: async (handles: string[]) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setGrid({
        handles,
        resultsByHandle: Object.fromEntries(handles.map((h) => [h, {}])),
      })

      const res = await api.checkBulkSse({
        handles,
        signal: controller.signal,
        onPartial: ({ handle, result }) => {
          setGrid((prev) => ({
            ...prev,
            resultsByHandle: {
              ...prev.resultsByHandle,
              [handle]: {
                ...(prev.resultsByHandle[handle] ?? {}),
                [result.platformKey]: result,
              },
            },
          }))
        },
      })

      return res
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['lastBulk'], data)
    },
  })

  React.useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      setGrid(emptyGridState)
      if (lastBulk.data) {
        // keep textarea content
      }
    }
  }, [lastBulk.data, open])

  const platforms = DEFAULT_PLATFORMS

  const canSave = Boolean(authState.accessToken)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Bulk check</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk handle checker</DialogTitle>
          <DialogDescription>
            Paste up to 50 handles (separated by spaces or new lines). Results stream in live.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`one\ntwo\nthree`}
            className="min-h-28"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                const handles = parseHandles(input)
                if (handles.length > 0) {
                  bulkMutation.mutate(handles)
                }
              }}
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending ? 'Checking…' : 'Start'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                abortRef.current?.abort()
              }}
              disabled={!bulkMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setInput('')
                setGrid(emptyGridState)
              }}
              disabled={bulkMutation.isPending}
            >
              Clear
            </Button>
          </div>

          {grid.handles.length > 0 ? (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    <th className="p-3 text-left font-medium">Handle</th>
                    {platforms.map((p) => (
                      <th key={p.key} className="p-3 text-left font-medium">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.handles.map((handle) => {
                    const row = grid.resultsByHandle[handle] ?? {}
                    return (
                      <tr key={handle} className="border-t">
                        <td className="p-3 font-medium">{handle}</td>
                        {platforms.map((p) => {
                          const cell = row[p.key]
                          const status = cell?.status ?? (bulkMutation.isPending ? 'pending' : 'unknown')

                          return (
                            <td key={p.key} className="p-3 align-top">
                              <div className="flex flex-col gap-2">
                                <StatusBadge status={status} />
                                {cell?.profileUrl ? (
                                  <a
                                    href={cell.profileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-muted-foreground underline"
                                  >
                                    View
                                  </a>
                                ) : null}

                                {canSave && cell?.platformId ? (
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        addFavorite.mutate({
                                          platformId: cell.platformId!,
                                          handle,
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
                                          platformId: cell.platformId!,
                                          handle,
                                        })
                                      }
                                    >
                                      Watch
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
