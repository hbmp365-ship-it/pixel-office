import {
  CHAT_HISTORY,
  MAX_CHAT_LEN,
  MAX_NAME_LEN,
  MAX_PLAYERS,
  isFiniteNumber,
  sanitizeText,
} from '../shared/protocol'
import type { ChatMessage, ClientMsg, Dir, PlayerState, ServerMsg } from '../shared/protocol'

const DIRS: Dir[] = ['down', 'up', 'left', 'right']

/** Movement is client-authoritative; the server only keeps values sane. */
const COORD_MAX = 8192
/** Minimum gap between two chat messages from the same socket. */
const CHAT_COOLDOWN_MS = 400
/** Positions are cheap to broadcast but costly to persist, so throttle the writes. */
const ATTACHMENT_WRITE_MS = 2000

interface Env {
  ASSETS: Fetcher
  OFFICE_ROOM: DurableObjectNamespace
}

/**
 * One instance per office. Uses the WebSocket Hibernation API so an idle room
 * costs nothing: player state lives in each socket's attachment and is rebuilt
 * whenever the object wakes up.
 */
export class OfficeRoom implements DurableObject {
  private ctx: DurableObjectState
  private players = new Map<string, PlayerState>()
  private sockets = new Map<string, WebSocket>()
  private hydrated = false
  private history: ChatMessage[] = []
  private historyLoaded = false
  private lastPersist = new Map<string, number>()
  private lastChat = new Map<string, number>()

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx
  }

  /* ------------------------------- connection ------------------------------- */

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }
    this.hydrate()
    if (this.ctx.getWebSockets().length >= MAX_PLAYERS) {
      return new Response('Room is full', { status: 503 })
    }
    const pair = new WebSocketPair()
    this.ctx.acceptWebSocket(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  /** Rebuilds the in-memory view from socket attachments after a hibernation wake. */
  private hydrate() {
    if (this.hydrated) return
    for (const ws of this.ctx.getWebSockets()) {
      const attached = ws.deserializeAttachment() as PlayerState | null
      if (attached?.id) {
        this.players.set(attached.id, attached)
        this.sockets.set(attached.id, ws)
      }
    }
    this.hydrated = true
  }

  private async loadHistory(): Promise<ChatMessage[]> {
    if (!this.historyLoaded) {
      this.history = (await this.ctx.storage.get<ChatMessage[]>('chat')) ?? []
      this.historyLoaded = true
    }
    return this.history
  }

  /* -------------------------------- messages -------------------------------- */

  async webSocketMessage(ws: WebSocket, raw: ArrayBuffer | string) {
    if (typeof raw !== 'string' || raw.length > 4096) return
    this.hydrate()

    let msg: ClientMsg
    try {
      msg = JSON.parse(raw) as ClientMsg
    } catch {
      return
    }
    if (!msg || typeof msg.t !== 'string') return

    switch (msg.t) {
      case 'join':
        await this.handleJoin(ws, msg)
        return
      case 'move':
        this.handleMove(ws, msg)
        return
      case 'chat':
        await this.handleChat(ws, msg)
        return
      case 'ping':
        this.sendTo(ws, { t: 'pong' })
        return
    }
  }

  private async handleJoin(ws: WebSocket, msg: Extract<ClientMsg, { t: 'join' }>) {
    const existing = ws.deserializeAttachment() as PlayerState | null
    const id = existing?.id ?? crypto.randomUUID()
    const name = sanitizeText(msg.name, MAX_NAME_LEN) || '익명'

    const player: PlayerState = {
      id,
      name,
      color: this.clampColor(msg.color),
      x: this.clampCoord(msg.x),
      y: this.clampCoord(msg.y),
      dir: 'down',
      moving: false,
      room: sanitizeText(msg.room, 20),
    }

    this.players.set(id, player)
    this.sockets.set(id, ws)
    ws.serializeAttachment(player)
    this.lastPersist.set(id, Date.now())

    const others = [...this.players.values()].filter((p) => p.id !== id)
    this.sendTo(ws, {
      t: 'welcome',
      you: player,
      players: others,
      history: await this.loadHistory(),
    })
    this.broadcast({ t: 'joined', player }, id)
  }

  private handleMove(ws: WebSocket, msg: Extract<ClientMsg, { t: 'move' }>) {
    const attached = ws.deserializeAttachment() as PlayerState | null
    if (!attached?.id) return
    const player = this.players.get(attached.id)
    if (!player) return

    player.x = this.clampCoord(msg.x)
    player.y = this.clampCoord(msg.y)
    player.dir = DIRS.includes(msg.dir) ? msg.dir : player.dir
    player.moving = msg.moving === true
    player.room = sanitizeText(msg.room, 20)

    const now = Date.now()
    if (now - (this.lastPersist.get(player.id) ?? 0) > ATTACHMENT_WRITE_MS) {
      this.lastPersist.set(player.id, now)
      ws.serializeAttachment(player)
    }

    this.broadcast(
      {
        t: 'moved',
        id: player.id,
        x: player.x,
        y: player.y,
        dir: player.dir,
        moving: player.moving,
        room: player.room,
      },
      player.id,
    )
  }

  private async handleChat(ws: WebSocket, msg: Extract<ClientMsg, { t: 'chat' }>) {
    const attached = ws.deserializeAttachment() as PlayerState | null
    if (!attached?.id) return
    const player = this.players.get(attached.id)
    if (!player) return

    const now = Date.now()
    if (now - (this.lastChat.get(player.id) ?? 0) < CHAT_COOLDOWN_MS) return
    this.lastChat.set(player.id, now)

    const text = sanitizeText(msg.text, MAX_CHAT_LEN)
    if (!text) return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      playerId: player.id,
      name: player.name,
      color: player.color,
      text,
      room: player.room,
      ts: now,
    }

    const history = await this.loadHistory()
    history.push(message)
    if (history.length > CHAT_HISTORY) history.splice(0, history.length - CHAT_HISTORY)
    this.ctx.waitUntil(this.ctx.storage.put('chat', history))

    this.broadcast({ t: 'chat', message })
  }

  /* -------------------------------- teardown -------------------------------- */

  webSocketClose(ws: WebSocket) {
    this.dropSocket(ws)
  }

  webSocketError(ws: WebSocket) {
    this.dropSocket(ws)
  }

  private dropSocket(ws: WebSocket) {
    this.hydrate()
    const attached = ws.deserializeAttachment() as PlayerState | null
    if (!attached?.id) return
    this.players.delete(attached.id)
    this.sockets.delete(attached.id)
    this.lastPersist.delete(attached.id)
    this.lastChat.delete(attached.id)
    this.broadcast({ t: 'left', id: attached.id })
  }

  /* --------------------------------- helpers -------------------------------- */

  private clampCoord(value: unknown): number {
    if (!isFiniteNumber(value)) return 0
    return Math.max(0, Math.min(COORD_MAX, Math.round(value * 100) / 100))
  }

  private clampColor(value: unknown): number {
    if (!isFiniteNumber(value)) return 0
    return Math.max(0, Math.min(7, Math.floor(value)))
  }

  private sendTo(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      // The socket is already gone; the close handler will clean it up.
    }
  }

  private broadcast(msg: ServerMsg, exceptId?: string) {
    const payload = JSON.stringify(msg)
    for (const [id, ws] of this.sockets) {
      if (id === exceptId) continue
      try {
        ws.send(payload)
      } catch {
        // Ignore individual send failures so one dead socket cannot stall the room.
      }
    }
  }
}
