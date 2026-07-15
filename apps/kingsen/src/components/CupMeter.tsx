// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useStrings } from '@/store/localeStore'

/** Bij hoeveel slokken het glas visueel "vol" staat (puur cosmetisch). */
const FULL_AT = 20

/** Het centrale glas: vulniveau schaalt met de slokken, met vier koning-pips. */
export default function CupMeter({ sips, kings }: { sips: number; kings: number }) {
  const strings = useStrings()
  const fill = Math.min(1, sips / FULL_AT)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-24 w-16 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-cyan/70 bg-night-950/50">
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-magenta to-cyan transition-[height] duration-500"
          style={{ height: `${fill * 100}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-ivory drop-shadow">
          {sips}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{strings.cupSips(sips)}</p>
      <div className="flex gap-1 text-sm" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < kings ? 'text-cyan' : 'text-night-700'}>
            ♛
          </span>
        ))}
      </div>
      {kings > 0 && (
        <p className="text-[10px] text-muted-foreground">{strings.kingsCount(Math.min(kings, 4))}</p>
      )}
    </div>
  )
}
