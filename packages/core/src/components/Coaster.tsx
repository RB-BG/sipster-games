// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/** Bierviltje: de standaard kaart-container. Kleuren komen uit de app-tokens (bg-card). */
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
