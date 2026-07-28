// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { PlayerState } from '@/engine/types'
import { cn } from '@/lib/utils'

interface PlayerChipProps {
  player: PlayerState
  active: boolean
  /** Aantal kaarten in de hand; getoond tijdens het spelen. */
  cards?: number
  /** Optioneel roltekentje. */
  badge?: string
}

export default function PlayerChip({ player, active, cards, badge }: PlayerChipProps) {
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
        {badge && <span className="text-sm">{badge}</span>}
      </span>
      <span className="max-w-20 truncate font-semibold">{player.name}</span>
      <span className={active ? 'opacity-80' : 'text-muted-foreground'}>
        {/* De bak-meter: cumulatieve strafpunten, plus het aantal handkaarten. */}
        <span className="font-bold">{player.score}</span> pt
        {cards !== undefined && <span className="ml-1">· 🂠{cards}</span>}
      </span>
    </div>
  )
}
