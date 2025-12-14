import type { FavoriteWithPlatform } from '@acme/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../auth/authStore'
import { useAppContext } from '../useAppContext'

export function useFavoritesQuery() {
  const { api, auth } = useAppContext()
  const { accessToken } = useAuth(auth)

  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await api.listFavorites()
      return res.favorites
    },
    enabled: Boolean(accessToken),
  })
}

export function useAddFavoriteMutation() {
  const { api } = useAppContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { platformId: number; handle: string; tags?: string; notes?: string }) => {
      const res = await api.addFavorite(input)
      return res.favorite
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      const previous = queryClient.getQueryData<FavoriteWithPlatform[]>(['favorites'])

      const tempId = -Math.floor(Math.random() * 1_000_000)

      const optimistic: FavoriteWithPlatform = {
        id: tempId,
        userId: 0,
        platformId: input.platformId,
        handle: input.handle,
        tags: input.tags ?? null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        platform: {
          id: input.platformId,
          key: 'unknown',
          name: 'Unknown',
          status: 'active',
          baseUrl: 'https://example.com',
          profileUrlTemplate: 'https://example.com/{handle}',
          handleRegex: null,
          iconUrl: null,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      queryClient.setQueryData<FavoriteWithPlatform[]>(['favorites'], (old = []) => [
        optimistic,
        ...old,
      ])

      return { previous, tempId }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['favorites'], ctx.previous)
      }
    },
    onSuccess: (favorite, _input, ctx) => {
      queryClient.setQueryData<FavoriteWithPlatform[]>(['favorites'], (old = []) => {
        if (!ctx?.tempId) return [favorite, ...old]
        return old.map((f) => (f.id === ctx.tempId ? favorite : f))
      })
    },
  })
}

export function useDeleteFavoriteMutation() {
  const { api } = useAppContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.deleteFavorite(id)
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      const previous = queryClient.getQueryData<FavoriteWithPlatform[]>(['favorites'])
      queryClient.setQueryData<FavoriteWithPlatform[]>(['favorites'], (old = []) =>
        old.filter((f) => f.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['favorites'], ctx.previous)
      }
    },
  })
}

export function useUpdateFavoriteMutation() {
  const { api } = useAppContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: { id: number; tags?: string; notes?: string }) => {
      const res = await api.updateFavorite(args.id, { tags: args.tags, notes: args.notes })
      return res.favorite
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<FavoriteWithPlatform[]>(['favorites'], (old = []) =>
        old.map((f) => (f.id === updated.id ? updated : f)),
      )
    },
  })
}
