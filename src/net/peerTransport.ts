import Peer, { type DataConnection } from 'peerjs'
import { PROTOCOL_VERSION, type GameEvent, type Intent } from '@/protocol/messages'
import type {
  GuestCallbacks,
  GuestTransport,
  HostCallbacks,
  HostTransport,
  WireEnvelope,
} from './transport'

const PEER_PREFIX = 'mexxen-'
// Zonder 0/O/1/I: roomcodes worden hardop voorgelezen aan de bar.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4
const MAX_CODE_RETRIES = 4
const MAX_RECONNECT_ATTEMPTS = 6

export function randomRoomCode(): string {
  const buf = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(buf)
  return [...buf].map((n) => CODE_CHARS[n % CODE_CHARS.length]).join('')
}

function wrap(msg: Intent | GameEvent): WireEnvelope {
  return { v: PROTOCOL_VERSION, msg }
}

function unwrap(data: unknown): Intent | GameEvent | null {
  const envelope = data as WireEnvelope
  if (!envelope || envelope.v !== PROTOCOL_VERSION || !envelope.msg) return null
  return envelope.msg
}

/** Host: claimt peer-id `mexxen-<code>`; bij een bezette code een nieuwe proberen. */
export function createHostTransport(callbacks: HostCallbacks): Promise<HostTransport> {
  return new Promise((resolve, reject) => {
    let attempts = 0

    function tryCode() {
      attempts++
      const roomCode = randomRoomCode()
      const peer = new Peer(PEER_PREFIX + roomCode)
      const connections = new Map<string, DataConnection>()

      peer.on('open', () => {
        peer.on('connection', (conn) => {
          conn.on('open', () => connections.set(conn.peer, conn))
          conn.on('data', (data) => {
            const msg = unwrap(data)
            if (msg) callbacks.onIntent(conn.peer, msg as Intent)
          })
          conn.on('close', () => {
            // Een reconnect vervangt de map-entry; de trage close van de OUDE
            // verbinding mag de nieuwe niet weggooien.
            if (connections.get(conn.peer) !== conn) return
            connections.delete(conn.peer)
            callbacks.onGuestDisconnect(conn.peer)
          })
        })

        resolve({
          roomCode,
          send: (peerId, event) => connections.get(peerId)?.send(wrap(event)),
          broadcast: (event) => {
            const envelope = wrap(event)
            for (const conn of connections.values()) conn.send(envelope)
          },
          close: () => peer.destroy(),
        })
      })

      peer.on('error', (err) => {
        if ((err as { type?: string }).type === 'unavailable-id' && attempts < MAX_CODE_RETRIES) {
          peer.destroy()
          tryCode()
        } else if (!peer.open) {
          reject(err)
        }
      })
    }

    tryCode()
  })
}

/** Guest: verbindt met de host en herstelt de verbinding met backoff. */
export function createGuestTransport(
  roomCode: string,
  callbacks: GuestCallbacks,
): Promise<GuestTransport> {
  return new Promise((resolve, reject) => {
    const peer = new Peer()
    let conn: DataConnection | null = null
    let reconnectAttempts = 0
    let reconnectScheduled = false
    let closed = false

    function connect() {
      callbacks.onStatus(reconnectAttempts === 0 ? 'connecting' : 'reconnecting')
      const mine = peer.connect(PEER_PREFIX + roomCode.toUpperCase(), { reliable: true })
      conn = mine

      // Alle handlers negeren verouderde verbindingen: close en error vuren
      // vaak allebei, en een vervangen conn sterft pas seconden later.
      mine.on('open', () => {
        if (conn !== mine) return
        reconnectAttempts = 0
        callbacks.onStatus('open')
        callbacks.onOpen()
      })
      mine.on('data', (data) => {
        if (conn !== mine) return
        const msg = unwrap(data)
        if (msg) callbacks.onEvent(msg as GameEvent)
      })
      const failed = () => {
        if (conn !== mine) return
        scheduleReconnect()
      }
      mine.on('close', failed)
      mine.on('error', failed)
    }

    function scheduleReconnect() {
      if (closed || reconnectScheduled) return
      reconnectScheduled = true
      reconnectAttempts++
      if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        callbacks.onStatus('closed')
        return
      }
      callbacks.onStatus('reconnecting')
      setTimeout(() => {
        reconnectScheduled = false
        if (closed) return
        // PeerJS verliest soms ook de signaling-verbinding; eerst die herstellen.
        if (peer.disconnected) peer.reconnect()
        connect()
      }, Math.min(8000, 500 * 2 ** reconnectAttempts))
    }

    peer.on('open', () => {
      connect()
      resolve({
        sendIntent: (intent) => {
          if (conn?.open) conn.send(wrap(intent))
        },
        close: () => {
          closed = true
          peer.destroy()
        },
      })
    })

    peer.on('error', (err) => {
      const type = (err as { type?: string }).type
      if (type === 'peer-unavailable') {
        callbacks.onStatus('closed')
      } else if (!peer.open) {
        reject(err)
      }
    })
  })
}
