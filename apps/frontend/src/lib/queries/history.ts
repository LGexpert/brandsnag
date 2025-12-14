import { useInfiniteQuery } from '@tanstack/react-query'

import { useAuth } from '../auth/authStore'
import { useAppContext } from '../useAppContext'

export function useHistoryInfiniteQuery(limit = 30) {
  const { api, auth } = useAppContext()
  const { accessToken } = useAuth(auth)

  return useInfiniteQuery({
    queryKey: ['history', { limit }],
    enabled: Boolean(accessToken),
    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as number | undefined) ?? 0
      return await api.listHistory({ limit, offset })
    },
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.pagination.offset + lastPage.pagination.limit
      return nextOffset >= lastPage.pagination.total ? undefined : nextOffset
    },
    initialPageParam: 0,
  })
}
