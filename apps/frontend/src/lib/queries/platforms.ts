import { useQuery } from '@tanstack/react-query'

import { useAppContext } from '../useAppContext'

export function usePlatformsQuery() {
  const { api } = useAppContext()

  return useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await api.getPlatforms()
      return res.platforms
    },
    staleTime: 60_000,
  })
}
