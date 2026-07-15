// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Card, PyramidState } from './types'

/** Rij-groottes van onder (5 kaarten, 1 slok) naar boven (1 kaart, 5 slokken). */
export const PYRAMID_ROW_SIZES = [5, 4, 3, 2, 1]

/** Aantal kaarten in de piramide. */
export function pyramidTotal(pyramid: PyramidState): number {
  return pyramid.rows.reduce((sum, row) => sum + row.length, 0)
}

/**
 * De kaarten in flip-volgorde (onderste rij eerst), met de rij-waarde
 * (slokken) van elke kaart. Rij-index 0 = 1 slok, oplopend naar de top.
 */
export function flatFlipOrder(rows: Card[][]): { card: Card; rowValue: number }[] {
  const flat: { card: Card; rowValue: number }[] = []
  rows.forEach((row, rowIndex) => {
    for (const card of row) {
      flat.push({ card, rowValue: rowIndex + 1 })
    }
  })
  return flat
}
