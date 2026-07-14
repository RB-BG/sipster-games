// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useState } from 'react'
import { ArrowLeft, Dices } from 'lucide-react'
import Coaster from '@/components/Coaster'
import RulesEditor from '@/components/RulesEditor'
import type { PlayerProfile, RuleConfig } from '@/engine/types'
import { useStrings } from '@/store/localeStore'
import { loadProfile, loadRules, newPlayerId, saveProfile, saveRules } from '@/lib/storage'
import { useGameStore } from '@/store/gameStore'

const EMOJI = ['🎲', '🍺', '😎', '🦊', '🐙', '🍀', '🌶️', '🫠']

interface Draft {
  name: string
  emojiIndex: number
}

export default function HotseatSetupScreen() {
  const strings = useStrings()
  const startHotseat = useGameStore((s) => s.startHotseat)
  const setScreen = useGameStore((s) => s.setScreen)
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    const profile = loadProfile()
    return [
      { name: profile?.name ?? '', emojiIndex: profile ? EMOJI.indexOf(profile.emoji) : 0 },
      { name: '', emojiIndex: 1 },
    ]
  })
  // Huisregels van het vorige potje als startpunt; afslaan heeft op één
  // telefoon geen zin (reactie-race), dus die staat hier altijd uit.
  const [rules, setRules] = useState<RuleConfig>(() => ({ ...loadRules(), afslaan: false }))

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function start() {
    const profiles: PlayerProfile[] = drafts.map((draft, i) => ({
      id: `speler-${i + 1}`,
      name: draft.name.trim() || `Speler ${i + 1}`,
      emoji: EMOJI[Math.max(0, draft.emojiIndex) % EMOJI.length],
    }))
    // Eerste speler is dit toestel: naam en huisregels onthouden voor de volgende keer.
    const stored = loadProfile()
    saveProfile({ id: stored?.id ?? newPlayerId(), name: profiles[0].name, emoji: profiles[0].emoji })
    saveRules(rules)
    startHotseat(profiles, rules)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-safe">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => setScreen('home')} aria-label="terug">
          <ArrowLeft className="size-5 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-bold text-ivory">{strings.players}</h1>
      </header>

      <Coaster className="flex flex-col gap-3">
        {drafts.map((draft, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateDraft(i, { emojiIndex: draft.emojiIndex + 1 })}
              className="rounded-lg bg-secondary p-2 text-xl leading-none"
              aria-label="kies emoji"
            >
              {EMOJI[Math.max(0, draft.emojiIndex) % EMOJI.length]}
            </button>
            <input
              value={draft.name}
              onChange={(e) => updateDraft(i, { name: e.target.value })}
              placeholder={`${strings.playerNamePlaceholder} (Speler ${i + 1})`}
              className="min-w-0 flex-1 rounded-lg border border-input bg-wood-950/40 px-3 py-2 text-ivory placeholder:text-muted-foreground"
            />
            {drafts.length > 2 && (
              <button
                type="button"
                onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                className="text-sm text-muted-foreground"
              >
                {strings.removePlayer}
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setDrafts((prev) => [...prev, { name: '', emojiIndex: prev.length % EMOJI.length }])
          }
          className="self-start rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
        >
          {strings.addPlayer}
        </button>
      </Coaster>

      <RulesEditor
        rules={rules}
        onChange={(patch) => setRules((prev) => ({ ...prev, ...patch }))}
        hideKeys={['afslaan']}
        note={strings.afslaanNeedsPhones}
      />

      <button
        type="button"
        onClick={start}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg active:scale-95"
      >
        <Dices className="size-5" />
        {strings.startGame}
      </button>
    </main>
  )
}
