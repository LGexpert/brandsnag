import type { UsernameCheckStatus } from '@acme/shared'

export type AdapterCheckResult = {
  status: UsernameCheckStatus
  profileUrl: string | null
  errorMessage: string | null
  responseMs: number | null
  checkedAt: Date
  cached?: boolean
}

export interface HandleCheckAdapter {
  check(handle: string): Promise<AdapterCheckResult>
}
