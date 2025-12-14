import * as React from 'react'

import { cn } from '../../lib/cn'

export const Separator = React.forwardRef<HTMLHRElement, React.ComponentProps<'hr'>>(
  ({ className, ...props }, ref) => (
    <hr ref={ref} className={cn('my-4 border-border', className)} {...props} />
  ),
)
Separator.displayName = 'Separator'
