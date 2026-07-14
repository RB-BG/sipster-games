// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { LogOut, WifiOff } from 'lucide-react'
import Coaster from '@/components/Coaster'
import QrShare from '@/components/QrShare'
import RulesEditor from '@/components/RulesEditor'
import type { RuleConfig } from '@/engine/types'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStrings } from '@/store/localeStore'
import { useNetStore } from '@/store/netStore'

/** Wachtruimte: QR + code delen, spelers zien binnenkomen, regels instellen. */
export default function LobbyScreen() {
  const strings = useStrings()
  const role = useNetStore((s) => s.role)
  const status = useNetStore((s) => s.status)
  const roomCode = useNetStore((s) => s.roomCode)
  const netState = useNetStore((s) => s.netState)
  const netError = useNetStore((s) => s.netError)
  const setRules = useNetStore((s) => s.setRules)
  const sendIntent = useNetStore((s) => s.sendIntent)
  const leave = useNetStore((s) => s.leave)

  // Schermvergrendeling doodt de verbinding; lobby open = scherm aan.
  useWakeLock()

  const isHost = role === 'host'
  const rules = netState?.rules

  function patchRules(patch: Partial<RuleConfig>) {
    if (rules) setRules({ ...rules, ...patch })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-safe">
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

      {rules && <RulesEditor rules={rules} disabled={!isHost} onChange={patchRules} />}

      {isHost ? (
        <>
          <button
            type="button"
            disabled={(netState?.players.length ?? 0) < 2}
            onClick={() => sendIntent({ t: 'START_GAME' })}
            className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
          >
            {strings.startGame}
          </button>
          {(netState?.players.length ?? 0) < 2 && (
            <p className="text-center text-xs text-muted-foreground">{strings.needMorePlayers}</p>
          )}
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{strings.waitForHost}</p>
      )}
    </main>
  )
}
