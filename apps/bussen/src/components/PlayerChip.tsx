// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { PlayerState } from '@/engine/types'
import { cn } from '@/lib/utils'

interface PlayerChipProps {
  player: PlayerState
  active: boolean
  /** Slokken deze fase; getoond naast het totaal als "fase/totaal". */
  roundSips: number
  /** Toont het bus-icoon als deze speler de bus rijdt. */
  driver?: boolean
}

export default function PlayerChip({ player, active, roundSips, driver }: PlayerChipProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs',
        active ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground',
        !player.connected && 'opacity-40 grayscale',
      )}
    >
      <span className="text-lg leading-none">
        {player.emoji}
        {driver && <span className="text-sm">🚌</span>}
      </span>
      <span className="max-w-20 truncate font-semibold">{player.name}</span>
      <span className={active ? 'opacity-80' : 'text-muted-foreground'}>
        {/* fase/totaal: het fase-getal vet zodat "wie drinkt nu hoeveel" opvalt. */}
        {player.hand.length}🃏 · <span className="font-bold">{roundSips}</span>/{player.sipsTotal}🍺
      </span>
    </div>
  )
}
