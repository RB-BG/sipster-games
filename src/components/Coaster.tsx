// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/** Bierviltje: de standaard kaart-container in de kroegstijl. */
export default function Coaster({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl bg-card p-4 text-card-foreground shadow-lg', className)}>
      {children}
    </div>
  )
}
