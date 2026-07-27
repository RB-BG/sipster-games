// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { card, orderedDeck, scriptedDeck, type DeckSource } from '@/engine/deck'
import type { GameEvent } from '@/protocol/messages'
import { createHostLoop } from './hostLoop'
import type { HostTransport } from './transport'

interface FakeTransport extends HostTransport {
  sent: { to: string; event: GameEvent }[]
  broadcasts: GameEvent[]
}

function fakeTransport(livePeers: Set<string> = new Set()): FakeTransport {
  const sent: { to: string; event: GameEvent }[] = []
  const broadcasts: GameEvent[] = []
  return {
    roomCode: 'TEST',
    send: (to, event) => sent.push({ to, event }),
    broadcast: (event) => broadcasts.push(event),
    isConnected: (peerId) => livePeers.has(peerId),
    close: () => {},
    sent,
    broadcasts,
  }
}

const HOST = { id: 'host-1', name: 'Ruben', emoji: '👑' }
const GUEST = { id: 'guest-1', name: 'Sanne', emoji: '🍺' }

function setup(rng: DeckSource = scriptedDeck(orderedDeck()), livePeers?: Set<string>) {
  const transport = fakeTransport(livePeers)
  const states: number[] = []
  const loop = createHostLoop(transport, HOST, (s) => states.push(s.version), rng)
  return { transport, loop, states }
}

describe('hostLoop lobby', () => {
  it('JOIN voegt een speler toe en stuurt de nieuwe speler de state', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })

    expect(loop.state.players.map((p) => p.id)).toEqual(['host-1', 'guest-1'])
    const msg = transport.sent.find((m) => m.to === 'peer-a' && m.event.t === 'STATE')
    expect(msg && msg.event.t === 'STATE' && msg.event.state.players.length).toBe(2)
  })

  it('een tweede JOIN van dezelfde peer is een resync, geen duplicaat', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    transport.sent.length = 0
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })

    expect(loop.state.players).toHaveLength(2)
    const resync = transport.sent.find((m) => m.to === 'peer-a' && m.event.t === 'STATE')
    expect(resync).toBeDefined()
  })

  it('LEAVE verwijdert de speler', () => {
    const { loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.handleIntent('peer-a', { t: 'LEAVE' })
    expect(loop.state.players.map((p) => p.id)).toEqual(['host-1'])
  })

  it('disconnect in de lobby verwijdert de speler', () => {
    const { loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.handleDisconnect('peer-a')
    expect(loop.state.players.map((p) => p.id)).toEqual(['host-1'])
  })

  it('een onbekende peer krijgt een foutmelding', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-x', { t: 'CALL_YOUSEF' })
    expect(transport.sent[0]?.event).toEqual({ t: 'ERROR', code: 'UNKNOWN_PLAYER' })
  })

  it('alleen de host mag regels wijzigen', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    const rules = {
      handSize: 6,
      yousefMax: 5,
      jokerWildcard: true,
      assafEveryoneScores: false,
      bakThreshold: 30,
    }

    loop.handleIntent('peer-a', { t: 'SET_RULES', rules })
    expect(loop.state.rules.handSize).toBe(5)
    expect(transport.sent.some((m) => m.to === 'peer-a' && m.event.t === 'ERROR')).toBe(true)

    loop.dispatchLocal({ t: 'SET_RULES', rules })
    expect(loop.state.rules.handSize).toBe(6)
  })
})

describe('hostLoop in-game', () => {
  it('host start het spel; de actieve speler kan spelen, de rest niet', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    expect(loop.state.phase).toBe('playing')
    expect(loop.state.turn?.playerId).toBe('host-1')

    // Guest is niet aan de beurt (host begint).
    loop.handleIntent('peer-a', {
      t: 'PLAY_TURN',
      discard: [card(3, 'hearts')],
      drawFrom: 'deck',
    })
    expect(transport.sent.at(-1)?.event).toEqual({ t: 'ERROR', code: 'NOT_YOUR_TURN' })

    // Host speelt een kaart uit zijn hand (harten 2 zit erin bij het geordende deck).
    transport.sent.length = 0
    loop.dispatchLocal({ t: 'PLAY_TURN', discard: [card(2, 'hearts')], drawFrom: 'deck' })
    expect(transport.sent.some((m) => m.to === 'peer-a' && m.event.t === 'STATE')).toBe(true)
    expect(loop.state.turn?.playerId).toBe('guest-1')
  })

  it('een guest kan het spel niet starten', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.handleIntent('peer-a', { t: 'START_GAME' })
    expect(loop.state.phase).toBe('lobby')
    expect(transport.sent.at(-1)?.event).toEqual({ t: 'ERROR', code: 'NOT_YOUR_TURN' })
  })

  it('REQUEST_SYNC stuurt de volledige state naar één peer', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    transport.sent.length = 0
    loop.handleIntent('peer-a', { t: 'REQUEST_SYNC' })
    expect(transport.sent[0]?.to).toBe('peer-a')
    expect(transport.sent[0]?.event.t).toBe('STATE')
  })

  it('LEAVE midden in een potje markeert offline in plaats van verwijderen', () => {
    const { loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    loop.handleIntent('peer-a', { t: 'LEAVE' })

    expect(loop.state.players).toHaveLength(2)
    expect(loop.state.players[1].connected).toBe(false)
  })

  it('de host-stoel is niet via JOIN te kapen', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-x', { t: 'JOIN', profile: { ...HOST } })

    expect(transport.sent.at(-1)?.event).toEqual({ t: 'ERROR', code: 'ALREADY_JOINED' })
    loop.handleIntent('peer-x', { t: 'START_GAME' })
    expect(loop.state.phase).toBe('lobby')
  })

  it('een stoel die live bezet is, is niet vanaf een andere peer te claimen', () => {
    const { transport, loop } = setup(undefined, new Set(['peer-a']))
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.handleIntent('peer-b', { t: 'JOIN', profile: { ...GUEST, name: 'Kaper' } })

    expect(transport.sent.at(-1)).toEqual({
      to: 'peer-b',
      event: { t: 'ERROR', code: 'ALREADY_JOINED' },
    })
    expect(loop.state.players).toHaveLength(2)
  })

  it('na een disconnect mag dezelfde speler wél opnieuw joinen', () => {
    const { loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    loop.handleDisconnect('peer-a')
    expect(loop.state.players[1].connected).toBe(false)

    loop.handleIntent('peer-a2', { t: 'JOIN', profile: GUEST })
    expect(loop.state.players[1].connected).toBe(true)
  })

  it('FORFEIT_TURN slaat de actieve speler over', () => {
    const { loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    expect(loop.state.turn?.playerId).toBe('host-1')

    loop.dispatchLocal({ t: 'FORFEIT_TURN' })
    expect(loop.state.turn?.playerId).toBe('guest-1')
  })
})

describe('hostLoop hardening', () => {
  it('een malformed intent crasht de loop niet en krijgt MALFORMED terug', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })

    loop.handleIntent('peer-a', { t: 'PLAY_TURN', discard: 'nope', drawFrom: 'deck' } as never)
    loop.handleIntent('peer-a', { t: 'PLAY_TURN', discard: [{}], drawFrom: 'space' } as never)
    loop.handleIntent('peer-a', { t: 'HACK_THE_PLANET' } as never)
    loop.handleIntent('peer-a', { t: 'JOIN', profile: { id: 7 } } as never)

    const errors = transport.sent.filter((m) => m.event.t === 'ERROR').map((m) => m.event)
    expect(errors).toHaveLength(4)
    for (const e of errors) expect(e).toEqual({ t: 'ERROR', code: 'MALFORMED' })
    expect(loop.state.phase).toBe('playing')
  })

  it('een mid-game joiner wordt niet gemapt: geen sync, geen spook-disconnect', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })

    loop.handleIntent('peer-late', { t: 'JOIN', profile: { id: 'late-1', name: 'Laat', emoji: '🐌' } })
    expect(transport.sent.at(-1)).toEqual({
      to: 'peer-late',
      event: { t: 'ERROR', code: 'WRONG_PHASE' },
    })
    loop.handleIntent('peer-late', { t: 'REQUEST_SYNC' })
    expect(transport.sent.at(-1)).toEqual({
      to: 'peer-late',
      event: { t: 'ERROR', code: 'UNKNOWN_PLAYER' },
    })
    const before = transport.broadcasts.length
    loop.handleDisconnect('peer-late')
    expect(transport.broadcasts.length).toBe(before)
  })

  it('één stoel per peer: een tweede JOIN met een andere id wordt geweigerd', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.handleIntent('peer-a', { t: 'JOIN', profile: { id: 'nep-2', name: 'Nep', emoji: '👻' } })

    expect(transport.sent.at(-1)).toEqual({
      to: 'peer-a',
      event: { t: 'ERROR', code: 'ALREADY_JOINED' },
    })
    expect(loop.state.players).toHaveLength(2)
  })

  it('profielvelden worden gesaneerd: lange namen worden afgekapt', () => {
    const { loop } = setup()
    loop.handleIntent('peer-a', {
      t: 'JOIN',
      profile: { id: 'guest-2', name: `  ${'x'.repeat(500)}`, emoji: '🍺' },
    })
    const joined = loop.state.players.find((p) => p.id === 'guest-2')
    expect(joined?.name.length).toBe(24)
  })

  it('de state naar een guest lekt de deck noch andermans hand', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })

    const toGuest = [...transport.sent].reverse().find((m) => m.to === 'peer-a' && m.event.t === 'STATE')
    expect(toGuest?.event.t).toBe('STATE')
    if (toGuest?.event.t === 'STATE') {
      const s = toGuest.event.state
      expect(s.deck).toHaveLength(0)
      expect(s.drawIndex).toBe(0)
      // De guest ziet zijn eigen hand, maar niet die van de host (alleen het aantal).
      const me = s.players.find((p) => p.id === 'guest-1')
      const host = s.players.find((p) => p.id === 'host-1')
      expect(me?.hand).toHaveLength(5)
      expect(host?.hand).toHaveLength(0)
      expect(host?.handCount).toBe(5)
    }
    // De host zelf houdt de volledige deck en alle handen.
    expect(loop.state.deck.length).toBeGreaterThan(0)
    expect(loop.state.players.every((p) => p.hand.length === 5)).toBe(true)
  })
})
