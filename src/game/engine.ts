import { BODY_H, BODY_W, LERP_MS, NET_TICK_MS, SPEED, TILE } from './constants'
import {
  MAP_H,
  MAP_W,
  T_DOOR,
  T_FLOOR,
  T_HALL,
  T_WALL,
  WORLD_H,
  WORLD_W,
  furniture,
  isSolidTile,
  rooms,
  roomNameAt,
  tileAt,
} from './map'
import { drawBoardLabel, drawDoor, drawFloor, drawFurniture, drawHall, drawWall } from './tiles'
import { AVATAR_H, drawAvatar, drawBubble, drawNameTag } from './sprites'
import type { PlayerState } from '../../shared/protocol'

interface Actor extends PlayerState {
  /** Rendered position, eased toward (x, y) for remote players. */
  rx: number
  ry: number
  frame: number
  animT: number
  bubble?: { text: string; until: number }
}

export interface LocalInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

const FALLBACK_THEME = rooms[0].theme

/** Room theme for a tile, used by the one-off map prerender. */
function themeForTile(tx: number, ty: number) {
  for (const room of rooms) {
    if (tx >= room.x0 - 1 && tx <= room.x1 + 1 && ty >= room.y0 - 1 && ty <= room.y1 + 1) {
      return room.theme
    }
  }
  return FALLBACK_THEME
}

/** Paints the entire static floor plan once into an offscreen canvas. */
function renderMapLayer(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = WORLD_W
  canvas.height = WORLD_H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#10141c'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const px = tx * TILE
      const py = ty * TILE
      const kind = tileAt(tx, ty)
      const theme = themeForTile(tx, ty)
      if (kind === T_FLOOR) drawFloor(ctx, px, py, tx, ty, theme)
      else if (kind === T_HALL) drawHall(ctx, px, py, tx, ty)
      else if (kind === T_DOOR) drawDoor(ctx, px, py, theme)
      else {
        const below = tileAt(tx, ty + 1)
        const above = tileAt(tx, ty - 1)
        drawWall(ctx, px, py, theme, below !== T_WALL, above !== T_WALL)
      }
    }
  }

  // Furniture is painted back-to-front so taller pieces overlap correctly.
  const sorted = [...furniture].sort((a, b) => a.y - b.y || a.x - b.x)
  for (const f of sorted) drawFurniture(ctx, f)
  for (const f of sorted) drawBoardLabel(ctx, f)

  // Department plaques, mirroring the yellow signs on a real floor plan.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const room of rooms) {
    const cx = (room.x0 + room.x1 + 1) * TILE * 0.5
    const cy = room.y0 * TILE - 8
    ctx.font = 'bold 11px "Galmuri11", "Apple SD Gothic Neo", sans-serif'
    const w = Math.ceil(ctx.measureText(room.name).width) + 14
    ctx.fillStyle = '#f0c040'
    ctx.fillRect(cx - w / 2, cy - 8, w, 15)
    ctx.fillStyle = '#8a6a14'
    ctx.fillRect(cx - w / 2, cy + 6, w, 2)
    ctx.fillStyle = '#3a2c06'
    ctx.fillText(room.name, cx, cy)
  }

  return canvas
}

export class OfficeGame {
  private ctx: CanvasRenderingContext2D
  private mapLayer: HTMLCanvasElement
  private actors = new Map<string, Actor>()
  private selfId = ''
  private raf = 0
  private last = 0
  private zoom = 3
  private dpr = 1
  private cssW = 0
  private cssH = 0
  private netAccum = 0
  private input: LocalInput = { up: false, down: false, left: false, right: false }
  /** Touch joystick vector, -1..1 on each axis. */
  private touch = { x: 0, y: 0 }

  /** Fired at most every NET_TICK_MS while the local player is moving. */
  onLocalMove: ((p: PlayerState) => void) | null = null
  /** Fired when the local player walks into or out of a department. */
  onRoomChange: ((room: string) => void) | null = null

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas is not available in this browser')
    this.ctx = ctx
    this.mapLayer = renderMapLayer()
    this.resize()
  }

  /* ------------------------------- lifecycle ------------------------------- */

  start() {
    if (this.raf) return
    this.last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 0.1)
      this.last = now
      this.update(dt)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.cssW = Math.max(rect.width, 1)
    this.cssH = Math.max(rect.height, 1)
    // Aim for roughly 26 tiles across, snapped to an integer zoom so pixels stay square.
    const fit = Math.min(this.cssW / (26 * TILE), this.cssH / (16 * TILE))
    this.zoom = Math.max(2, Math.min(4, Math.round(fit)))
    this.canvas.width = Math.round(this.cssW * this.dpr)
    this.canvas.height = Math.round(this.cssH * this.dpr)
    this.ctx.imageSmoothingEnabled = false
  }

  /* --------------------------------- state --------------------------------- */

  setSelf(player: PlayerState) {
    this.selfId = player.id
    this.upsert(player)
  }

  upsert(player: PlayerState) {
    const existing = this.actors.get(player.id)
    if (existing) {
      Object.assign(existing, player)
      return
    }
    this.actors.set(player.id, { ...player, rx: player.x, ry: player.y, frame: 0, animT: 0 })
  }

  /** Applies a remote movement patch; unknown players are ignored. */
  applyMove(id: string, x: number, y: number, dir: PlayerState['dir'], moving: boolean, room: string) {
    const actor = this.actors.get(id)
    if (!actor || id === this.selfId) return
    actor.x = x
    actor.y = y
    actor.dir = dir
    actor.moving = moving
    actor.room = room
  }

  remove(id: string) {
    this.actors.delete(id)
  }

  clear() {
    this.actors.clear()
  }

  setBubble(id: string, text: string, ttlMs: number) {
    const actor = this.actors.get(id)
    if (actor) actor.bubble = { text, until: performance.now() + ttlMs }
  }

  get self(): PlayerState | undefined {
    return this.actors.get(this.selfId)
  }

  get playerCount() {
    return this.actors.size
  }

  setInput(next: Partial<LocalInput>) {
    this.input = { ...this.input, ...next }
  }

  setTouchVector(x: number, y: number) {
    this.touch.x = x
    this.touch.y = y
  }

  releaseInput() {
    this.input = { up: false, down: false, left: false, right: false }
    this.touch = { x: 0, y: 0 }
  }

  /* --------------------------------- update -------------------------------- */

  private update(dt: number) {
    const me = this.actors.get(this.selfId)
    if (me) this.moveLocal(me, dt)

    for (const actor of this.actors.values()) {
      if (actor.id !== this.selfId) {
        const t = Math.min(1, (dt * 1000) / LERP_MS)
        actor.rx += (actor.x - actor.rx) * t
        actor.ry += (actor.y - actor.ry) * t
      }
      if (actor.moving) {
        actor.animT += dt
        actor.frame = Math.floor(actor.animT / 0.18) % 2
      } else {
        actor.animT = 0
        actor.frame = 0
      }
    }

    if (me) {
      this.netAccum += dt * 1000
      if (this.netAccum >= NET_TICK_MS) {
        this.netAccum = 0
        this.onLocalMove?.({ ...me })
      }
    }
  }

  private moveLocal(me: Actor, dt: number) {
    let dx = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0) + this.touch.x
    let dy = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0) + this.touch.y
    dx = Math.max(-1, Math.min(1, dx))
    dy = Math.max(-1, Math.min(1, dy))

    const len = Math.hypot(dx, dy)
    const wasMoving = me.moving
    me.moving = len > 0.15

    if (me.moving) {
      // Resolve each axis separately so sliding along a wall feels natural.
      const nx = (dx / len) * SPEED * dt
      const ny = (dy / len) * SPEED * dt
      me.x = this.sweepAxis(me.x, me.y, nx, 'x')
      me.y = this.sweepAxis(me.x, me.y, ny, 'y')
      me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    }

    me.rx = me.x
    me.ry = me.y

    const room = roomNameAt(me.x, me.y - 2)
    if (room !== me.room) {
      me.room = room
      this.onRoomChange?.(room)
    }
    if (wasMoving && !me.moving) this.onLocalMove?.({ ...me })
  }

  /** Moves one axis and stops at the first solid tile the body would enter. */
  private sweepAxis(x: number, y: number, delta: number, axis: 'x' | 'y'): number {
    if (delta === 0) return axis === 'x' ? x : y
    const nx = axis === 'x' ? x + delta : x
    const ny = axis === 'y' ? y + delta : y
    if (this.bodyBlocked(nx, ny)) return axis === 'x' ? x : y
    const clampedX = Math.max(BODY_W / 2, Math.min(WORLD_W - BODY_W / 2, nx))
    const clampedY = Math.max(BODY_H, Math.min(WORLD_H - 1, ny))
    return axis === 'x' ? clampedX : clampedY
  }

  private bodyBlocked(cx: number, feetY: number): boolean {
    const left = cx - BODY_W / 2
    const right = cx + BODY_W / 2 - 0.01
    const top = feetY - BODY_H
    const bottom = feetY - 0.01
    for (const px of [left, right]) {
      for (const py of [top, bottom]) {
        if (isSolidTile(Math.floor(px / TILE), Math.floor(py / TILE))) return true
      }
    }
    return false
  }

  /* ---------------------------------- draw --------------------------------- */

  private draw() {
    const ctx = this.ctx
    const scale = this.zoom * this.dpr
    const viewW = this.cssW / this.zoom
    const viewH = this.cssH / this.zoom
    const me = this.actors.get(this.selfId)
    const focusX = me ? me.rx : WORLD_W / 2
    const focusY = me ? me.ry - AVATAR_H / 2 : WORLD_H / 2

    const camX = WORLD_W <= viewW
      ? (WORLD_W - viewW) / 2
      : Math.max(0, Math.min(WORLD_W - viewW, focusX - viewW / 2))
    const camY = WORLD_H <= viewH
      ? (WORLD_H - viewH) / 2
      : Math.max(0, Math.min(WORLD_H - viewH, focusY - viewH / 2))

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#0b0e14'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale)
    ctx.imageSmoothingEnabled = false

    ctx.drawImage(this.mapLayer, 0, 0)

    const visible = [...this.actors.values()].filter(
      (a) => a.rx > camX - 32 && a.rx < camX + viewW + 32 && a.ry > camY - 48 && a.ry < camY + viewH + 48,
    )
    visible.sort((a, b) => a.ry - b.ry)

    for (const a of visible) {
      drawAvatar(ctx, a.rx, a.ry, a.color, a.dir, a.frame)
    }
    const now = performance.now()
    for (const a of visible) {
      drawNameTag(ctx, a.rx, a.ry - AVATAR_H, a.name, a.id === this.selfId)
      if (a.bubble && a.bubble.until > now) drawBubble(ctx, a.rx, a.ry - AVATAR_H, a.bubble.text)
      else if (a.bubble) a.bubble = undefined
    }
  }
}
