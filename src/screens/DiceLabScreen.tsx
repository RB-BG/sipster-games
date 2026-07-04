import { useState } from 'react'
import DiceScene, { type RollRequest } from '@/game3d/DiceScene'
import type { Die, DieId } from '@/engine/types'

/**
 * Dev-only speeltuin (/?dice) om de dice-steering te bewijzen:
 * stel de gewenste uitkomst in en die komt gegarandeerd boven.
 */
export default function DiceLabScreen() {
  const [target, setTarget] = useState<[Die, Die]>([6, 6])
  const [held, setHeld] = useState<[boolean, boolean]>([false, false])
  const [roll, setRoll] = useState<RollRequest | null>(null)
  const [rolling, setRolling] = useState(false)
  const [lastSeed, setLastSeed] = useState<number | null>(null)
  const [result, setResult] = useState<string | null>(null)

  function gooi(seed?: number) {
    if (rolling) return
    const dieIds = ([0, 1] as DieId[]).filter((id) => !held[id])
    if (dieIds.length === 0) return
    const animSeed = seed ?? Math.floor(Math.random() * 2 ** 32)
    setLastSeed(animSeed)
    setResult(null)
    setRolling(true)
    setRoll({
      id: (roll?.id ?? 0) + 1,
      dieIds,
      values: dieIds.map((id) => target[id]),
      animSeed,
    })
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="h-[55dvh]">
        <DiceScene
          roll={roll}
          held={held}
          onDieClick={(id) => {
            if (rolling) return
            setHeld((prev) => (id === 0 ? [!prev[0], prev[1]] : [prev[0], !prev[1]]))
          }}
          onSettled={(_, values) => {
            setRolling(false)
            setResult(`geland: ${values.join(' en ')}`)
          }}
        />
      </div>

      <section className="flex flex-col gap-4 p-4">
        <h1 className="text-lg font-bold text-amber-warm">Dice-lab</h1>

        <div className="flex items-center gap-4">
          {([0, 1] as DieId[]).map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              steen {id + 1}:
              <select
                value={target[id]}
                onChange={(e) => {
                  const value = Number(e.target.value) as Die
                  setTarget((prev) => (id === 0 ? [value, prev[1]] : [prev[0], value]))
                }}
                className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground"
              >
                {[1, 2, 3, 4, 5, 6].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {held[id] && <span className="text-amber-soft">ligt vast</span>}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={rolling}
            onClick={() => gooi()}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
          >
            Gooi
          </button>
          <button
            type="button"
            disabled={rolling || lastSeed === null}
            onClick={() => gooi(lastSeed as number)}
            className="rounded-lg bg-secondary px-6 py-2 text-secondary-foreground active:scale-95 disabled:opacity-60"
          >
            Zelfde seed nog eens
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {result ?? (rolling ? 'aan het rollen…' : 'tik op een steen om hem vast te leggen')}
          {lastSeed !== null && ` · seed ${lastSeed}`}
        </p>
      </section>
    </main>
  )
}
