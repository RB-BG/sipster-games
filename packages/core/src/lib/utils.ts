// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
