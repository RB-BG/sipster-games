import { ArrowLeft } from 'lucide-react'
import Coaster from '@/components/Coaster'
import RulesExplainer from '@/components/RulesExplainer'
import { strings } from '@/i18n/strings'
import { useGameStore } from '@/store/gameStore'

/** Alleen-lezen regeluitleg, bereikbaar vanaf de startpagina. */
export default function RulesScreen() {
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => setScreen('home')} aria-label="terug">
          <ArrowLeft className="size-5 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-bold text-ivory">{strings.rulesExplainTitle}</h1>
      </header>

      <Coaster className="text-sm text-muted-foreground">
        <RulesExplainer />
      </Coaster>
    </main>
  )
}
