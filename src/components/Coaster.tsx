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
