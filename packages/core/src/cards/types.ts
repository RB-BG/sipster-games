// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
/** 2..10 op waarde, 11=boer, 12=vrouw, 13=heer/koning, 14=aas (hoog). */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  suit: Suit
  rank: Rank
}
