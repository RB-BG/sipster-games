import { rankLabel } from '@/engine/score'
import type { PlayerState } from '@/engine/types'
import { cn } from '@/lib/utils'

interface PlayerChipProps {
  player: PlayerState
  active: boolean
  /** Verberg de rondescore zolang de worp-animatie nog loopt. */
  hideScore?: boolean
}

export default function PlayerChip({ player, active, hideScore }: PlayerChipProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs',
        active ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground',
        !player.connected && 'opacity-40 grayscale',
      )}
    >
      <span className="text-lg leading-none">{player.emoji}</span>
      <span className="max-w-20 truncate font-semibold">{player.name}</span>
      <span className={active ? 'opacity-80' : 'text-muted-foreground'}>
        {player.roundScore !== null && !hideScore ? rankLabel(player.roundScore) : '·'}
        {' · '}
        {player.sipsTotal}🍺
      </span>
    </div>
  )
}
