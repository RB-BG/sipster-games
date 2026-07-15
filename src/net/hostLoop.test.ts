// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { orderedDeck, scriptedDeck, type DeckSource } from '@/engine/deck'
import type { AnswerChoice } from '@/engine/types'
import type { GameEvent } from '@/protocol/messages'
import { createHostLoop, type HostLoop } from './hostLoop'
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

const HOST = { id: 'host-1', name: 'Ruben', emoji: '🃏' }
const GUEST = { id: 'guest-1', name: 'Sanne', emoji: '🍺' }

function setup(rng: DeckSource = scriptedDeck(orderedDeck()), livePeers?: Set<string>) {
  const transport = fakeTransport(livePeers)
  const states: number[] = []
  const loop = createHostLoop(transport, HOST, (s) => states.push(s.version), rng)
  return { transport, loop, states }
}

/** Speel het vragenrondje uit (alles fout, dus geen give-stappen) tot de piramide. */
function driveToPyramid(loop: HostLoop): void {
  const wrong: AnswerChoice[] = ['zwart', 'lager', 'binnen', 'niet']
  while (loop.state.phase === 'questions') {
    const turn = loop.state.turn!
    const choice = wrong[turn.questionIndex]
    if (turn.playerId === HOST.id) loop.dispatchLocal({ t: 'ANSWER', choice })
    else loop.handleIntent('peer-a', { t: 'ANSWER', choice })
  }
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
    loop.handleIntent('peer-x', { t: 'ANSWER', choice: 'rood' })
    expect(transport.sent[0]?.event).toEqual({ t: 'ERROR', code: 'UNKNOWN_PLAYER' })
  })

  it('alleen de host mag regels wijzigen', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    const rules = { ...loop.state.rules, standaardSlokken: 4 }

    loop.handleIntent('peer-a', { t: 'SET_RULES', rules })
    expect(loop.state.rules.standaardSlokken).toBe(1)
    expect(transport.sent.some((m) => m.to === 'peer-a' && m.event.t === 'ERROR')).toBe(true)

    loop.dispatchLocal({ t: 'SET_RULES', rules })
    expect(loop.state.rules.standaardSlokken).toBe(4)
  })
})

describe('hostLoop in-game', () => {
  it('host start het spel; de actieve speler kan antwoorden, de rest niet', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    expect(loop.state.phase).toBe('questions')

    // Guest is niet aan de beurt (host begint).
    loop.handleIntent('peer-a', { t: 'ANSWER', choice: 'rood' })
    expect(transport.sent.at(-1)?.event).toEqual({ t: 'ERROR', code: 'NOT_YOUR_TURN' })

    // Host antwoordt: eerst een CARD_EVENT voor de animatie, daarna STATE.
    transport.broadcasts.length = 0
    loop.dispatchLocal({ t: 'ANSWER', choice: 'rood' })
    expect(transport.broadcasts[0]).toMatchObject({ t: 'CARD_EVENT', kind: 'deal' })
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

  it('flippen is host-only; een claim van een guest wordt verwerkt en gebroadcast', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    driveToPyramid(loop)
    expect(loop.state.phase).toBe('pyramid')

    // Guest mag niet flippen.
    loop.handleIntent('peer-a', { t: 'FLIP_PYRAMID' })
    expect(transport.sent.at(-1)?.event).toEqual({ t: 'ERROR', code: 'NOT_YOUR_TURN' })
    expect(loop.state.pyramid?.flipIndex).toBe(0)

    // Host flipt: CARD_EVENT (flip) + STATE.
    transport.broadcasts.length = 0
    loop.dispatchLocal({ t: 'FLIP_PYRAMID' })
    expect(transport.broadcasts[0]).toMatchObject({ t: 'CARD_EVENT', kind: 'flip' })
    const rank = loop.state.pyramid!.currentRank!

    // Guest claimt de opengedraaide rank (mag met de bluf-regel, ook zonder de kaart).
    transport.broadcasts.length = 0
    loop.handleIntent('peer-a', { t: 'PLAY_CARD', card: { rank, suit: 'spades' } })
    expect(loop.state.pyramid?.openClaim?.claimantId).toBe('guest-1')
    expect(transport.broadcasts.at(-1)?.t).toBe('STATE')

    // Host roept call bluff: BLUFF_EVENT + STATE, claim afgehandeld.
    transport.broadcasts.length = 0
    loop.dispatchLocal({ t: 'CALL_BLUFF', targetPlayerId: 'guest-1' })
    expect(transport.broadcasts.some((e) => e.t === 'BLUFF_EVENT')).toBe(true)
    expect(loop.state.pyramid?.openClaim).toBeNull()
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

  it('FORFEIT_TURN slaat de actieve speler in het vragenrondje over', () => {
    const { loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    expect(loop.state.turn?.playerId).toBe('host-1')

    loop.dispatchLocal({ t: 'FORFEIT_TURN' })
    expect(loop.state.turn?.playerId).toBe('guest-1')
  })
})
