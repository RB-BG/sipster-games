// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

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
  it('JOIN voegt een speler toe en broadcast de volledige state', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })

    expect(loop.state.players.map((p) => p.id)).toEqual(['host-1', 'guest-1'])
    const stateEvent = transport.broadcasts.find((e) => e.t === 'STATE')
    expect(stateEvent && stateEvent.t === 'STATE' && stateEvent.state.players.length).toBe(2)
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
    loop.handleIntent('peer-x', { t: 'FLIP_CARD' })
    expect(transport.sent[0]?.event).toEqual({ t: 'ERROR', code: 'UNKNOWN_PLAYER' })
  })

  it('alleen de host mag regels wijzigen', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    const rules = { standaardSlokken: 4 }

    loop.handleIntent('peer-a', { t: 'SET_RULES', rules })
    expect(loop.state.rules.standaardSlokken).toBe(1)
    expect(transport.sent.some((m) => m.to === 'peer-a' && m.event.t === 'ERROR')).toBe(true)

    loop.dispatchLocal({ t: 'SET_RULES', rules })
    expect(loop.state.rules.standaardSlokken).toBe(4)
  })
})

describe('hostLoop in-game', () => {
  it('host start het spel; de actieve speler kan flippen, de rest niet', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    expect(loop.state.phase).toBe('playing')
    expect(loop.state.turn?.playerId).toBe('host-1')

    // Guest is niet aan de beurt (host begint).
    loop.handleIntent('peer-a', { t: 'FLIP_CARD' })
    expect(transport.sent.at(-1)?.event).toEqual({ t: 'ERROR', code: 'NOT_YOUR_TURN' })

    // Host flipt: eerst een CARD_EVENT voor de animatie, daarna STATE.
    transport.broadcasts.length = 0
    loop.dispatchLocal({ t: 'FLIP_CARD' })
    expect(transport.broadcasts[0]).toMatchObject({ t: 'CARD_EVENT', kind: 'flip' })
    expect(transport.broadcasts.at(-1)?.t).toBe('STATE')
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

  it('een koning opent de cup-invoer; de actieve speler vult hem', () => {
    // Deck met een koning bovenaan zodat de eerste flip de cup opent.
    const deck = [card(13, 'spades'), card(3, 'hearts'), card(6, 'clubs')]
    const { transport, loop } = setup(scriptedDeck(deck))
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })

    transport.broadcasts.length = 0
    loop.dispatchLocal({ t: 'FLIP_CARD' })
    expect(transport.broadcasts[0]).toMatchObject({ t: 'CARD_EVENT', kind: 'flip' })
    expect(loop.state.kingsDrawn).toBe(1)
    expect(loop.state.pending).toEqual({ kind: 'cup', playerId: 'host-1' })

    loop.dispatchLocal({ t: 'ADD_TO_CUP', amount: 5 })
    expect(loop.state.cup).toBe(5)
    expect(loop.state.pending).toBeNull()
    expect(loop.state.turn?.playerId).toBe('guest-1')
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
