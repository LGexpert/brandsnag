import type { UsernameCheckStatus } from '@acme/shared'

import { Badge } from './ui/badge'

export function StatusBadge({ status }: { status: UsernameCheckStatus | 'pending' }) {
  if (status === 'pending') {
    return <Badge variant="secondary">Checking…</Badge>
  }

  if (status === 'available') {
    return <Badge variant="success">Available</Badge>
  }

  if (status === 'taken') {
    return <Badge variant="destructive">Taken</Badge>
  }

  if (status === 'invalid') {
    return <Badge variant="warning">Invalid</Badge>
  }

  if (status === 'error') {
    return <Badge variant="destructive">Error</Badge>
  }

  return <Badge variant="outline">Unknown</Badge>
}
