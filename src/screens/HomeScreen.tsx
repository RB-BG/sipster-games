// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { BookOpen, Dices, Smartphone, Users } from 'lucide-react'
import LocaleSwitch from '@/components/LocaleSwitch'
import { useStrings } from '@/store/localeStore'
import { useGameStore } from '@/store/gameStore'

export default function HomeScreen() {
  const strings = useStrings()
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 px-6 pt-safe pb-safe text-center">
      <div className="absolute right-[calc(1rem+env(safe-area-inset-right))] top-[calc(1rem+env(safe-area-inset-top))]">
        <LocaleSwitch />
      </div>
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
          onClick={() => setScreen('host')}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Users className="size-5" />
          {strings.createTable}
        </button>
        <button
          type="button"
          onClick={() => setScreen('join')}
          className="rounded-lg bg-secondary px-8 py-3 text-lg font-semibold text-secondary-foreground shadow-lg transition-transform active:scale-95"
        >
          {strings.joinTable}
        </button>
        <button
          type="button"
          onClick={() => setScreen('setup')}
          className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-8 py-3 text-lg font-semibold text-secondary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Smartphone className="size-5" />
          {strings.hotseat}
        </button>
        <button
          type="button"
          onClick={() => setScreen('rules')}
          className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors active:text-ivory"
        >
          <BookOpen className="size-4" />
          {strings.rulesExplainTitle}
        </button>
      </div>
    </main>
  )
}
