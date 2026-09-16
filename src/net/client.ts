import type { ClientMsg, ServerMsg } from '../../shared/protocol'

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

interface Options {
  /** Sent immediately after every (re)connect so the server can restore the player. */
  joinMessage: () => ClientMsg
  onMessage: (msg: ServerMsg) => void
  onStatus: (status: ConnStatus) => void
}

const MAX_BACKOFF_MS = 10_000
const HEARTBEAT_MS = 25_000

export class OfficeSocket {
  private ws: WebSocket | null = null
  private attempt = 0
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private retry: ReturnType<typeof setTimeout> | null = null
  private closedByUs = false

  private opts: Options

  constructor(opts: Options) {
    this.opts = opts
  }

  connect() {
    this.closedByUs = false
    this.opts.onStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')

    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${scheme}//${location.host}/ws`)
    this.ws = ws

    ws.addEventListener('open', () => {
      this.attempt = 0
      this.opts.onStatus('open')
      this.send(this.opts.joinMessage())
      this.heartbeat = setInterval(() => this.send({ t: 'ping' }), HEARTBEAT_MS)
    })

    ws.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return
      try {
        this.opts.onMessage(JSON.parse(event.data) as ServerMsg)
      } catch {
        // A malformed frame is not worth tearing the session down for.
      }
    })

    ws.addEventListener('close', () => this.scheduleReconnect())
    ws.addEventListener('error', () => ws.close())
  }

  private scheduleReconnect() {
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = null
    this.ws = null
    if (this.closedByUs) {
      this.opts.onStatus('closed')
      return
    }
    this.opts.onStatus('reconnecting')
    const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempt)
    this.attempt += 1
    this.retry = setTimeout(() => this.connect(), delay)
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  close() {
    this.closedByUs = true
    if (this.retry) clearTimeout(this.retry)
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.ws?.close()
    this.ws = null
  }
}
