// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Coaster from '@/components/Coaster'
import { useStrings } from '@/store/localeStore'
import { loadProfile, newPlayerId, saveProfile } from '@/lib/storage'
import { useGameStore } from '@/store/gameStore'
import { useNetStore } from '@/store/netStore'

const EMOJI = ['🃏', '🍺', '😎', '🦊', '🐙', '🍀', '🌶️', '🫠']

interface ProfileScreenProps {
  mode: 'host' | 'join'
  initialCode?: string
}

/** Naam + emoji invullen en dan een tafel maken of joinen. */
export default function ProfileScreen({ mode, initialCode }: ProfileScreenProps) {
  const strings = useStrings()
  const setScreen = useGameStore((s) => s.setScreen)
  const hostLobby = useNetStore((s) => s.hostLobby)
  const joinLobby = useNetStore((s) => s.joinLobby)
  const status = useNetStore((s) => s.status)
  const netError = useNetStore((s) => s.netError)

  const stored = loadProfile()
  const [name, setName] = useState(stored?.name ?? '')
  const [emojiIndex, setEmojiIndex] = useState(() => {
    const index = stored ? EMOJI.indexOf(stored.emoji) : 0
    return index >= 0 ? index : 0
  })
  const [code, setCode] = useState(initialCode ?? '')

  const busy = status === 'connecting'
  const canSubmit = !busy && name.trim().length > 0 && (mode === 'host' || code.trim().length >= 4)

  function submit() {
    const profile = {
      id: stored?.id ?? newPlayerId(),
      name: name.trim(),
      emoji: EMOJI[emojiIndex % EMOJI.length],
    }
    saveProfile(profile)
    if (mode === 'host') void hostLobby(profile)
    else void joinLobby(code, profile)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-safe">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            // De ?room-invite verbruiken, anders matcht de router dit scherm opnieuw.
            const url = new URL(window.location.href)
            if (url.searchParams.has('room')) {
              url.searchParams.delete('room')
              window.history.replaceState(null, '', url)
            }
            setScreen('home')
          }}
          aria-label="terug"
        >
          <ArrowLeft className="size-5 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-bold text-ivory">
          {mode === 'host' ? strings.makeTable : strings.joinNow}
        </h1>
      </header>

      <Coaster className="flex flex-col gap-3">
        <label className="text-sm text-muted-foreground">{strings.yourName}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEmojiIndex((i) => i + 1)}
            className="rounded-lg bg-secondary p-2 text-xl leading-none"
            aria-label="kies emoji"
          >
            {EMOJI[emojiIndex % EMOJI.length]}
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={strings.playerNamePlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-input bg-night-950/40 px-3 py-2 text-ivory placeholder:text-muted-foreground"
          />
        </div>

        {mode === 'join' && (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={strings.codePlaceholder}
            maxLength={4}
            autoCapitalize="characters"
            className="rounded-lg border border-input bg-night-950/40 px-3 py-2 text-center text-2xl tracking-[0.4em] text-ivory placeholder:text-base placeholder:tracking-normal placeholder:text-muted-foreground"
          />
        )}
      </Coaster>

      {netError && <p className="text-sm text-destructive">{netError}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-50"
      >
        {busy && <Loader2 className="size-5 animate-spin" />}
        {busy ? strings.connecting : mode === 'host' ? strings.makeTable : strings.joinNow}
      </button>
    </main>
  )
}
