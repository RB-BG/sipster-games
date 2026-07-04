import { Dices, Smartphone } from 'lucide-react'
import { strings } from '@/i18n/strings'
import { useGameStore } from '@/store/gameStore'

export default function HomeScreen() {
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Dices className="size-14 text-amber-warm" aria-hidden />
        <h1 className="font-heading text-6xl font-bold tracking-tight text-ivory">
          {strings.appName}
        </h1>
        <p className="text-lg text-muted-foreground">{strings.tagline}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => setScreen('setup')}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Smartphone className="size-5" />
          {strings.hotseat}
        </button>
        <button
          type="button"
          disabled
          className="rounded-lg bg-secondary px-8 py-3 text-lg font-semibold text-secondary-foreground shadow-lg disabled:opacity-50"
        >
          {strings.createTable}
        </button>
        <p className="text-sm text-muted-foreground">
          {strings.createTable}: {strings.comingSoon.toLowerCase()}
        </p>
      </div>
    </main>
  )
}
