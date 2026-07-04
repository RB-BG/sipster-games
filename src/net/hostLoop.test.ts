import { describe, expect, it } from 'vitest'
import { scriptedRollSource } from '@/engine/rng'
import type { GameEvent } from '@/protocol/messages'
import { createHostLoop } from './hostLoop'
import type { HostTransport } from './transport'

interface FakeTransport extends HostTransport {
  sent: { to: string; event: GameEvent }[]
  broadcasts: GameEvent[]
}

function fakeTransport(): FakeTransport {
  const sent: { to: string; event: GameEvent }[] = []
  const broadcasts: GameEvent[] = []
  return {
    roomCode: 'TEST',
    send: (to, event) => sent.push({ to, event }),
    broadcast: (event) => broadcasts.push(event),
    close: () => {},
    sent,
    broadcasts,
  }
}

const HOST = { id: 'host-1', name: 'Ruben', emoji: '🎲' }
const GUEST = { id: 'guest-1', name: 'Sanne', emoji: '🍺' }

function setup(rng = scriptedRollSource([])) {
  const transport = fakeTransport()
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

  it('een tweede JOIN met hetzelfde speler-id is een resync, geen duplicaat', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.handleIntent('peer-a2', { t: 'JOIN', profile: GUEST })

    expect(loop.state.players).toHaveLength(2)
    const resync = transport.sent.find((m) => m.to === 'peer-a2' && m.event.t === 'STATE')
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
    loop.handleIntent('peer-x', { t: 'ROLL' })
    expect(transport.sent[0]?.event).toEqual({ t: 'ERROR', code: 'UNKNOWN_PLAYER' })
  })

  it('alleen de host mag regels wijzigen', () => {
    const { transport, loop } = setup()
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    const rules = { ...loop.state.rules, standaardSlokken: 4 }

    loop.handleIntent('peer-a', { t: 'SET_RULES', rules })
    expect(loop.state.rules.standaardSlokken).toBe(2)
    expect(transport.sent.some((m) => m.to === 'peer-a' && m.event.t === 'ERROR')).toBe(true)

    loop.dispatchLocal({ t: 'SET_RULES', rules })
    expect(loop.state.rules.standaardSlokken).toBe(4)
  })
})

describe('hostLoop in-game', () => {
  it('host start het spel en de actieve speler kan gooien; de rest niet', () => {
    const rng = scriptedRollSource([6, 4])
    const { transport, loop } = setup(rng)
    loop.handleIntent('peer-a', { t: 'JOIN', profile: GUEST })
    loop.dispatchLocal({ t: 'START_GAME' })
    expect(loop.state.phase).toBe('playing')

    // Guest is niet aan de beurt (host begint).
    loop.handleIntent('peer-a', { t: 'ROLL' })
    expect(transport.sent.at(-1)?.event).toEqual({ t: 'ERROR', code: 'NOT_YOUR_TURN' })

    // Host gooit: eerst een ROLL_EVENT voor de animatie, daarna STATE.
    transport.broadcasts.length = 0
    loop.dispatchLocal({ t: 'ROLL' })
    expect(transport.broadcasts[0]).toMatchObject({
      t: 'ROLL_EVENT',
      playerId: 'host-1',
      values: [6, 4],
    })
    expect(transport.broadcasts[1]?.t).toBe('STATE')
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
})
