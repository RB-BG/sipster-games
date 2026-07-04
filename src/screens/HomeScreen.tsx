import { Dices } from 'lucide-react'
import { strings } from '@/i18n/strings'

export default function HomeScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Dices className="size-14 text-amber-warm" aria-hidden />
        <h1 className="font-heading text-6xl font-bold tracking-tight text-ivory">
          {strings.appName}
        </h1>
        <p className="text-lg text-muted-foreground">{strings.tagline}</p>
      </div>

      <button
        type="button"
        disabled
        className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-60"
      >
        {strings.createTable}
      </button>
      <p className="text-sm text-muted-foreground">{strings.comingSoon}</p>
    </main>
  )
}
