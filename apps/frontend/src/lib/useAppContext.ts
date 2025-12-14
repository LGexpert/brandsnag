import { useRouter } from '@tanstack/react-router'

import type { AppRouterContext } from './context'

export function useAppContext(): AppRouterContext {
  return useRouter().options.context as AppRouterContext
}
