import { LogOut, WifiOff } from 'lucide-react'
import Coaster from '@/components/Coaster'
import QrShare from '@/components/QrShare'
import type { RuleConfig } from '@/engine/types'
import { useWakeLock } from '@/hooks/useWakeLock'
import { strings } from '@/i18n/strings'
import { useNetStore } from '@/store/netStore'

/** Wachtruimte: QR + code delen, spelers zien binnenkomen, regels instellen. */
export default function LobbyScreen() {
  const role = useNetStore((s) => s.role)
  const status = useNetStore((s) => s.status)
  const roomCode = useNetStore((s) => s.roomCode)
  const netState = useNetStore((s) => s.netState)
  const netError = useNetStore((s) => s.netError)
  const setRules = useNetStore((s) => s.setRules)
  const leave = useNetStore((s) => s.leave)

  // Schermvergrendeling doodt de verbinding; lobby open = scherm aan.
  useWakeLock()

  const isHost = role === 'host'
  const rules = netState?.rules

  function patchRules(patch: Partial<RuleConfig>) {
    if (rules) setRules({ ...rules, ...patch })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ivory">{strings.lobbyTitle}</h1>
        <button
          type="button"
          onClick={leave}
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <LogOut className="size-4" />
          {isHost ? strings.closeTable : strings.leaveTable}
        </button>
      </header>

      {roomCode && (
        <Coaster className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">{strings.roomCodeLabel}</p>
          <p className="text-4xl font-bold tracking-[0.3em] text-amber-soft">{roomCode}</p>
          <QrShare roomCode={roomCode} />
        </Coaster>
      )}

      {status === 'reconnecting' && (
        <p className="flex items-center gap-2 text-sm text-amber-soft">
          <WifiOff className="size-4" /> {strings.reconnecting}
        </p>
      )}
      {netError && <p className="text-sm text-destructive">{netError}</p>}

      <Coaster className="flex flex-col gap-2">
        <h2 className="text-sm text-muted-foreground">{strings.players}</h2>
        {netState?.players.length ? (
          <ul className="flex flex-col gap-1">
            {netState.players.map((player) => (
              <li key={player.id} className="flex items-center gap-2 text-ivory">
                <span className="text-xl">{player.emoji}</span>
                <span className="font-semibold">{player.name}</span>
                {player.id === netState.hostId && (
                  <span className="text-xs text-muted-foreground">host</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{strings.waitingForPlayers}</p>
        )}
      </Coaster>

      {rules && (
        <Coaster className="flex flex-col gap-3">
          <h2 className="text-sm text-muted-foreground">{strings.rulesTitle}</h2>

          <div className="flex items-center justify-between text-ivory">
            <span>{strings.ruleLabels.standaardSlokken}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isHost || rules.standaardSlokken <= 1}
                onClick={() => patchRules({ standaardSlokken: rules.standaardSlokken - 1 })}
                className="size-8 rounded-lg bg-secondary text-secondary-foreground disabled:opacity-40"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{rules.standaardSlokken}</span>
              <button
                type="button"
                disabled={!isHost || rules.standaardSlokken >= 6}
                onClick={() => patchRules({ standaardSlokken: rules.standaardSlokken + 1 })}
                className="size-8 rounded-lg bg-secondary text-secondary-foreground disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {(
            [
              'tempo',
              'omgekeerdeMex',
              'ridder',
              'dubbeleRidder',
              'afslaan',
              'tiebreakHoogsteVerliest',
            ] as const
          ).map((key) => (
            <label key={key} className="flex items-center justify-between text-ivory">
              <span>{strings.ruleLabels[key]}</span>
              <input
                type="checkbox"
                checked={rules[key]}
                disabled={!isHost}
                onChange={(e) => patchRules({ [key]: e.target.checked })}
                className="size-5 accent-amber-warm"
              />
            </label>
          ))}
        </Coaster>
      )}

      <button
        type="button"
        disabled
        className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground opacity-50"
      >
        {strings.startGame}
      </button>
      <p className="text-center text-xs text-muted-foreground">{strings.startWhenReady}</p>
    </main>
  )
}
