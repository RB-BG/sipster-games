// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { rankLabel } from '@/engine/score'
import type { PlayerState } from '@/engine/types'
import { cn } from '@/lib/utils'

interface PlayerChipProps {
  player: PlayerState
  active: boolean
  /** Slokken deze ronde; getoond naast het totaal als "ronde/totaal". */
  roundSips: number
  /** 'ridder' of 'dubbel' toont het schildje. */
  ridder?: 'ridder' | 'dubbel' | null
}

export default function PlayerChip({ player, active, roundSips, ridder }: PlayerChipProps) {
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
        {ridder && <span className="text-sm">🛡️{ridder === 'dubbel' ? '²' : ''}</span>}
      </span>
      <span className="max-w-20 truncate font-semibold">{player.name}</span>
      <span className={active ? 'opacity-80' : 'text-muted-foreground'}>
        {player.roundScore !== null ? rankLabel(player.roundScore) : '·'}
        {' · '}
        {/* ronde/totaal: het ronde-getal vet zodat "wie drinkt nu hoeveel" opvalt. */}
        <span className="font-bold">{roundSips}</span>/{player.sipsTotal}🍺
      </span>
    </div>
  )
}
