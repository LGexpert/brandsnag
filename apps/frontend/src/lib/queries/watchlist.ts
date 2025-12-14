import type { WatchlistItemWithPlatform, WatchlistItemStatus } from '@acme/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../auth/authStore'
import { useAppContext } from '../useAppContext'

export function useWatchlistQuery() {
  const { api, auth } = useAppContext()
  const { accessToken } = useAuth(auth)

  return useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await api.listWatchlist()
      return res.watchlist
    },
    enabled: Boolean(accessToken),
  })
}

export function useAddWatchlistMutation() {
  const { api } = useAppContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { platformId: number; handle: string; tags?: string; notes?: string }) => {
      const res = await api.addWatchlistItem(input)
      return res.watchlistItem
    },
    onSuccess: (item) => {
      queryClient.setQueryData<WatchlistItemWithPlatform[]>(['watchlist'], (old = []) => [
        item,
        ...old,
      ])
    },
  })
}

export function useUpdateWatchlistMutation() {
  const { api } = useAppContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      id: number
      status?: WatchlistItemStatus
      tags?: string
      notes?: string
    }) => {
      const res = await api.updateWatchlistItem(args.id, {
        status: args.status,
        tags: args.tags,
        notes: args.notes,
      })
      return res.watchlistItem
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<WatchlistItemWithPlatform[]>(['watchlist'], (old = []) =>
        old.map((w) => (w.id === updated.id ? updated : w)),
      )
    },
  })
}

export function useDeleteWatchlistMutation() {
  const { api } = useAppContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.deleteWatchlistItem(id)
      return id
    },
    onSuccess: (id) => {
      queryClient.setQueryData<WatchlistItemWithPlatform[]>(['watchlist'], (old = []) =>
        old.filter((w) => w.id !== id),
      )
    },
  })
}
