// Message contract shared by the browser client and the Durable Object.
// Keep both sides in sync by importing from here only.

export const PROTOCOL_VERSION = 1

export const MAX_NAME_LEN = 12
export const MAX_CHAT_LEN = 200
export const MAX_PLAYERS = 60
export const CHAT_HISTORY = 50

/** Facing direction, also used to pick the sprite row. */
export type Dir = 'down' | 'up' | 'left' | 'right'

export interface PlayerState {
  id: string
  name: string
  /** Index into AVATAR_COLORS. */
  color: number
  /** World position in pixels (feet anchor). */
  x: number
  y: number
  dir: Dir
  moving: boolean
  /** Department label the player is standing in, '' while in the hallway. */
  room: string
}

export interface ChatMessage {
  id: string
  playerId: string
  name: string
  color: number
  text: string
  room: string
  ts: number
}

/* --------------------------------- client -> server --------------------------------- */

export type ClientMsg =
  | { t: 'join'; name: string; color: number; x: number; y: number; room: string }
  | { t: 'move'; x: number; y: number; dir: Dir; moving: boolean; room: string }
  | { t: 'chat'; text: string }
  | { t: 'ping' }

/* --------------------------------- server -> client --------------------------------- */

export type ServerMsg =
  | { t: 'welcome'; you: PlayerState; players: PlayerState[]; history: ChatMessage[] }
  | { t: 'joined'; player: PlayerState }
  | { t: 'moved'; id: string; x: number; y: number; dir: Dir; moving: boolean; room: string }
  | { t: 'left'; id: string }
  | { t: 'chat'; message: ChatMessage }
  | { t: 'error'; reason: string }
  | { t: 'pong' }

const CONTROL_CHARS = /[\p{Cc}\p{Cf}]/gu

/** Strip control characters, collapse whitespace, then hard-limit the length. */
export function sanitizeText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}
