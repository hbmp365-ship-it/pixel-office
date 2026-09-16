import { TILE } from './constants'

/* ------------------------------------------------------------------ *
 * The office is a fixed, hand-authored floor plan: two columns of
 * department rooms joined by a central hallway. Everything below is
 * expressed in tiles; world pixels are tiles * TILE.
 * ------------------------------------------------------------------ */

export const MAP_W = 60
export const MAP_H = 45

export const T_WALL = 0
export const T_FLOOR = 1
export const T_HALL = 2
export const T_DOOR = 3

/** Interior bounds of the two room columns (inclusive). */
const LEFT_X0 = 1
const LEFT_X1 = 26
const RIGHT_X0 = 33
const RIGHT_X1 = 58
const HALL_X0 = 28
const HALL_X1 = 31
const LEFT_DOOR_X = 27
const RIGHT_DOOR_X = 32

/** Top row of each of the four horizontal bands; every room is 10 tiles tall. */
const BAND_Y = [1, 12, 23, 34]
const ROOM_H = 10

export interface Theme {
  floor: string
  floorAlt: string
  wall: string
  wallTop: string
  accent: string
}

export type FurnitureKind =
  | 'desk'
  | 'chair'
  | 'table'
  | 'bookshelf'
  | 'cabinet'
  | 'plant'
  | 'sofa'
  | 'safe'
  | 'printer'
  | 'watercooler'
  | 'server'
  | 'board'
  | 'partition'
  | 'rug'

export interface Furniture {
  kind: FurnitureKind
  /** Tile coordinates of the top-left cell. */
  x: number
  y: number
  w: number
  h: number
  solid: boolean
  /** Which way a chair faces; unused by other kinds. */
  facing?: 'up' | 'down'
  /** Text painted on a `board`. */
  label?: string
  accent: string
}

export interface Room {
  id: string
  name: string
  x0: number
  y0: number
  x1: number
  y1: number
  theme: Theme
  door: { x: number; y: number }
  /** Tile the player appears on when they pick this department. */
  spawn: { x: number; y: number }
}

type Layout = 'desks' | 'cubicles' | 'table'

interface RoomSpec {
  id: string
  name: string
  side: 'left' | 'right'
  band: number
  layout: Layout
  theme: Theme
  /** Extra furniture in room-local tile coordinates. */
  extras: Array<Omit<Furniture, 'accent' | 'solid'> & { solid?: boolean }>
}

const themes = {
  finance: { floor: '#8e9a86', floorAlt: '#849077', wall: '#6d6152', wallTop: '#8a7a66', accent: '#c9a227' },
  hr: { floor: '#9fb8c9', floorAlt: '#93aebf', wall: '#5f6a72', wallTop: '#7c8892', accent: '#4a90c2' },
  design: { floor: '#b79a76', floorAlt: '#ab8e6b', wall: '#6b5a48', wallTop: '#88735c', accent: '#e0564f' },
  support: { floor: '#a9b4bd', floorAlt: '#9daab4', wall: '#5e666d', wallTop: '#79838b', accent: '#3f9a63' },
  legal: { floor: '#a68a63', floorAlt: '#9a7f5a', wall: '#5d4c3a', wallTop: '#7b6650', accent: '#8a6b3d' },
  ops: { floor: '#9db99f', floorAlt: '#92ad94', wall: '#5c6a5d', wallTop: '#788778', accent: '#3f9a63' },
  marketing: { floor: '#7ba8c4', floorAlt: '#709cb8', wall: '#54626d', wallTop: '#6f7f8b', accent: '#d9a03a' },
  sales: { floor: '#7fa87f', floorAlt: '#749c74', wall: '#525f52', wallTop: '#6d7b6d', accent: '#2fa39b' },
} satisfies Record<string, Theme>

/** Local coordinates are kept clear at lx 0..1 and lx 24..25 for ly 3..6 so
 *  neither doorway (left rooms enter at lx 25, right rooms at lx 0) is blocked. */
const SPECS: RoomSpec[] = [
  {
    id: 'finance', name: '재무부', side: 'left', band: 0, layout: 'desks', theme: themes.finance,
    extras: [
      { kind: 'safe', x: 2, y: 1, w: 2, h: 2 },
      { kind: 'cabinet', x: 5, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 6, y: 1, w: 1, h: 1 },
      { kind: 'printer', x: 21, y: 1, w: 1, h: 1 },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: '결산 현황' },
    ],
  },
  {
    id: 'hr', name: '인사부', side: 'left', band: 1, layout: 'desks', theme: themes.hr,
    extras: [
      { kind: 'cabinet', x: 2, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 3, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 4, y: 1, w: 1, h: 1 },
      { kind: 'sofa', x: 20, y: 1, w: 2, h: 1 },
      { kind: 'watercooler', x: 22, y: 1, w: 1, h: 1 },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: '직원 복지' },
    ],
  },
  {
    id: 'design', name: '디자인팀', side: 'left', band: 2, layout: 'desks', theme: themes.design,
    extras: [
      { kind: 'bookshelf', x: 2, y: 1, w: 1, h: 1 },
      { kind: 'bookshelf', x: 3, y: 1, w: 1, h: 1 },
      { kind: 'rug', x: 20, y: 5, w: 4, h: 3, solid: false },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: '무드보드' },
    ],
  },
  {
    id: 'support', name: '고객지원부', side: 'left', band: 3, layout: 'cubicles', theme: themes.support,
    extras: [
      { kind: 'cabinet', x: 2, y: 1, w: 1, h: 1 },
      { kind: 'printer', x: 3, y: 1, w: 1, h: 1 },
      { kind: 'plant', x: 21, y: 1, w: 1, h: 1 },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: 'FAQ Board' },
    ],
  },
  {
    id: 'legal', name: '법무부', side: 'right', band: 0, layout: 'table', theme: themes.legal,
    extras: [
      { kind: 'bookshelf', x: 2, y: 1, w: 1, h: 1 },
      { kind: 'bookshelf', x: 3, y: 1, w: 1, h: 1 },
      { kind: 'bookshelf', x: 4, y: 1, w: 1, h: 1 },
      { kind: 'bookshelf', x: 5, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 21, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 22, y: 1, w: 1, h: 1 },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: '법률 검토' },
    ],
  },
  {
    id: 'ops', name: '경영지원부', side: 'right', band: 1, layout: 'desks', theme: themes.ops,
    extras: [
      { kind: 'printer', x: 2, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 3, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 4, y: 1, w: 1, h: 1 },
      { kind: 'watercooler', x: 21, y: 1, w: 1, h: 1 },
      { kind: 'server', x: 22, y: 1, w: 1, h: 2 },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: '조직도' },
    ],
  },
  {
    id: 'marketing', name: '마케팅부', side: 'right', band: 2, layout: 'desks', theme: themes.marketing,
    extras: [
      { kind: 'cabinet', x: 2, y: 1, w: 1, h: 1 },
      { kind: 'sofa', x: 20, y: 1, w: 2, h: 1 },
      { kind: 'watercooler', x: 22, y: 1, w: 1, h: 1 },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: '캠페인 전략' },
    ],
  },
  {
    id: 'sales', name: '영업부', side: 'right', band: 3, layout: 'desks', theme: themes.sales,
    extras: [
      { kind: 'cabinet', x: 2, y: 1, w: 1, h: 1 },
      { kind: 'cabinet', x: 3, y: 1, w: 1, h: 1 },
      { kind: 'server', x: 21, y: 1, w: 1, h: 2 },
      { kind: 'printer', x: 22, y: 1, w: 1, h: 1 },
      { kind: 'board', x: 14, y: 0, w: 4, h: 1, label: 'Sales Target' },
    ],
  },
]

const SOLID_KINDS = new Set<FurnitureKind>([
  'desk', 'chair', 'table', 'bookshelf', 'cabinet', 'plant',
  'sofa', 'safe', 'printer', 'watercooler', 'server', 'board', 'partition',
])

function buildRoom(spec: RoomSpec): Room {
  const x0 = spec.side === 'left' ? LEFT_X0 : RIGHT_X0
  const x1 = spec.side === 'left' ? LEFT_X1 : RIGHT_X1
  const y0 = BAND_Y[spec.band]
  const doorX = spec.side === 'left' ? LEFT_DOOR_X : RIGHT_DOOR_X
  return {
    id: spec.id,
    name: spec.name,
    x0,
    y0,
    x1,
    y1: y0 + ROOM_H - 1,
    theme: spec.theme,
    door: { x: doorX, y: y0 + 4 },
    spawn: { x: spec.side === 'left' ? x0 + 24 : x0 + 1, y: y0 + 5 },
  }
}

function furnishRoom(spec: RoomSpec, room: Room): Furniture[] {
  const out: Furniture[] = []
  const accent = spec.theme.accent
  const put = (
    kind: FurnitureKind,
    lx: number,
    ly: number,
    w = 1,
    h = 1,
    rest: Partial<Furniture> = {},
  ) => {
    out.push({
      kind,
      x: room.x0 + lx,
      y: room.y0 + ly,
      w,
      h,
      solid: rest.solid ?? SOLID_KINDS.has(kind),
      accent,
      facing: rest.facing,
      label: rest.label,
    })
  }

  // Shared dressing: a name board on the back wall and corner greenery.
  put('board', 3, 0, 4, 1, { label: spec.name })
  put('plant', 24, 0)
  put('plant', 24, 9)
  put('plant', 2, 9)

  if (spec.layout === 'table') {
    put('table', 9, 3, 8, 3)
    for (let i = 0; i < 8; i++) {
      put('chair', 9 + i, 2, 1, 1, { facing: 'down' })
      put('chair', 9 + i, 6, 1, 1, { facing: 'up' })
    }
  } else {
    const columns = [7, 11, 15, 19]
    for (const lx of columns) {
      for (const ly of [3, 7]) {
        put('desk', lx, ly, 2, 1)
        put('chair', lx, ly + 1, 1, 1, { facing: 'up' })
        if (spec.layout === 'cubicles') {
          put('partition', lx + 2, ly)
          put('partition', lx + 2, ly + 1)
        }
      }
    }
  }

  for (const e of spec.extras) {
    put(e.kind, e.x, e.y, e.w, e.h, {
      solid: e.solid ?? SOLID_KINDS.has(e.kind),
      label: e.label,
      facing: e.facing,
    })
  }
  return out
}

export const rooms: Room[] = SPECS.map(buildRoom)

export const furniture: Furniture[] = SPECS.flatMap((spec, i) => furnishRoom(spec, rooms[i]))

/** Hallway greenery, placed away from every doorway. */
for (const y of [3, 14, 25, 36]) {
  for (const x of [HALL_X0, HALL_X1]) {
    furniture.push({ kind: 'plant', x, y, w: 1, h: 1, solid: true, accent: '#3f9a63' })
  }
}

export const tiles = new Uint8Array(MAP_W * MAP_H).fill(T_WALL)
export const solid = new Uint8Array(MAP_W * MAP_H).fill(1)

const idx = (x: number, y: number) => y * MAP_W + x

for (const room of rooms) {
  for (let y = room.y0; y <= room.y1; y++) {
    for (let x = room.x0; x <= room.x1; x++) {
      tiles[idx(x, y)] = T_FLOOR
      solid[idx(x, y)] = 0
    }
  }
}

for (let y = 1; y <= MAP_H - 2; y++) {
  for (let x = HALL_X0; x <= HALL_X1; x++) {
    tiles[idx(x, y)] = T_HALL
    solid[idx(x, y)] = 0
  }
}

for (const room of rooms) {
  for (let dy = 0; dy < 2; dy++) {
    tiles[idx(room.door.x, room.door.y + dy)] = T_DOOR
    solid[idx(room.door.x, room.door.y + dy)] = 0
  }
}

for (const f of furniture) {
  if (!f.solid) continue
  for (let y = f.y; y < f.y + f.h; y++) {
    for (let x = f.x; x < f.x + f.w; x++) {
      if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) solid[idx(x, y)] = 1
    }
  }
}

export function tileAt(tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T_WALL
  return tiles[idx(tx, ty)]
}

export function isSolidTile(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true
  return solid[idx(tx, ty)] === 1
}

/** Department name for a world-pixel position, or '' when in the hallway. */
export function roomNameAt(worldX: number, worldY: number): string {
  const tx = Math.floor(worldX / TILE)
  const ty = Math.floor(worldY / TILE)
  for (const room of rooms) {
    if (tx >= room.x0 && tx <= room.x1 && ty >= room.y0 && ty <= room.y1) return room.name
  }
  return ''
}

/** World-pixel spawn point for a department id, or the hallway when unknown. */
export function spawnPoint(roomId: string): { x: number; y: number } {
  const room = rooms.find((r) => r.id === roomId)
  if (!room) return { x: 29 * TILE + TILE / 2, y: 20 * TILE + TILE }
  return { x: room.spawn.x * TILE + TILE / 2, y: room.spawn.y * TILE + TILE }
}

export const WORLD_W = MAP_W * TILE
export const WORLD_H = MAP_H * TILE
