import { TILE } from './constants'
import type { Furniture, Theme } from './map'

type Ctx = CanvasRenderingContext2D

/** Every drawing helper works in world pixels; `r` fills an axis-aligned rect. */
function r(ctx: Ctx, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/* --------------------------------- ground --------------------------------- */

export function drawFloor(ctx: Ctx, px: number, py: number, tx: number, ty: number, theme: Theme) {
  const checker = (tx + ty) % 2 === 0
  r(ctx, checker ? theme.floor : theme.floorAlt, px, py, TILE, TILE)
  r(ctx, 'rgba(0,0,0,0.07)', px, py + TILE - 1, TILE, 1)
  r(ctx, 'rgba(0,0,0,0.07)', px + TILE - 1, py, 1, TILE)
}

export function drawHall(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  r(ctx, '#d8c6a4', px, py, TILE, TILE)
  // Offset brick courses, four bricks per tile row.
  const offset = ty % 2 === 0 ? 0 : 4
  r(ctx, 'rgba(120,95,60,0.22)', px, py + 7, TILE, 1)
  r(ctx, 'rgba(120,95,60,0.22)', px, py + 15, TILE, 1)
  for (const [row, shift] of [[0, offset], [8, (offset + 4) % 8]] as const) {
    for (let bx = -shift; bx < TILE; bx += 8) {
      const sx = px + bx + 8
      if (sx > px && sx < px + TILE) r(ctx, 'rgba(120,95,60,0.22)', sx, py + row, 1, 7)
    }
  }
  if ((tx * 7 + ty * 13) % 11 === 0) r(ctx, 'rgba(255,255,255,0.10)', px + 4, py + 4, 3, 2)
}

export function drawWall(
  ctx: Ctx,
  px: number,
  py: number,
  theme: Theme,
  openBelow: boolean,
  openAbove: boolean,
) {
  r(ctx, theme.wall, px, py, TILE, TILE)
  r(ctx, theme.wallTop, px, py, TILE, 4)
  r(ctx, 'rgba(0,0,0,0.25)', px, py + TILE - 2, TILE, 2)
  r(ctx, 'rgba(255,255,255,0.06)', px, py + 4, TILE, 1)
  if (openBelow) {
    // Front face of a wall that a player can stand in front of: add a baseboard.
    r(ctx, 'rgba(0,0,0,0.30)', px, py + TILE - 4, TILE, 4)
    r(ctx, 'rgba(255,255,255,0.08)', px, py + TILE - 4, TILE, 1)
  }
  if (openAbove) r(ctx, 'rgba(0,0,0,0.18)', px, py, TILE, 2)
}

export function drawDoor(ctx: Ctx, px: number, py: number, theme: Theme) {
  r(ctx, '#c9b998', px, py, TILE, TILE)
  r(ctx, theme.accent, px, py + 6, TILE, 4)
  r(ctx, 'rgba(0,0,0,0.18)', px, py, TILE, 2)
  r(ctx, 'rgba(0,0,0,0.18)', px, py + TILE - 2, TILE, 2)
}

/* -------------------------------- furniture -------------------------------- */

const WOOD = '#8a5a34'
const WOOD_DARK = '#6a4227'
const WOOD_LIGHT = '#a97347'
const METAL = '#8d949c'
const METAL_DARK = '#5f666e'
const SCREEN = '#2a3b4d'

type Draw = (ctx: Ctx, x: number, y: number, w: number, h: number, f: Furniture) => void

const painters: Record<Furniture['kind'], Draw> = {
  desk(ctx, x, y, w, h) {
    r(ctx, WOOD_DARK, x + 1, y + 3, w - 2, h - 3)
    r(ctx, WOOD, x + 1, y + 3, w - 2, h - 6)
    r(ctx, WOOD_LIGHT, x + 1, y + 3, w - 2, 2)
    // Monitor + keyboard on the left half of the desk.
    r(ctx, METAL_DARK, x + 4, y - 3, 9, 7)
    r(ctx, SCREEN, x + 5, y - 2, 7, 5)
    r(ctx, '#7fd0e8', x + 6, y - 1, 3, 2)
    r(ctx, METAL_DARK, x + 7, y + 4, 3, 2)
    r(ctx, '#d8d8d8', x + w - 12, y + 7, 8, 3)
    r(ctx, 'rgba(0,0,0,0.25)', x + 1, y + h - 3, w - 2, 3)
  },
  chair(ctx, x, y, w, h, f) {
    const seat = '#3b3f46'
    const up = f.facing === 'up'
    r(ctx, seat, x + 3, y + 5, w - 6, h - 8)
    r(ctx, '#4a5058', x + 3, y + (up ? 2 : h - 6), w - 6, 4)
    r(ctx, METAL_DARK, x + w / 2 - 1, y + h - 4, 2, 3)
    r(ctx, METAL_DARK, x + 3, y + h - 2, w - 6, 2)
  },
  table(ctx, x, y, w, h) {
    r(ctx, WOOD_DARK, x + 2, y + 2, w - 4, h - 4)
    r(ctx, WOOD, x + 3, y + 3, w - 6, h - 8)
    r(ctx, WOOD_LIGHT, x + 3, y + 3, w - 6, 2)
    r(ctx, 'rgba(255,255,255,0.10)', x + 6, y + 6, w - 12, 3)
    r(ctx, 'rgba(0,0,0,0.25)', x + 2, y + h - 4, w - 4, 4)
  },
  bookshelf(ctx, x, y, w, h) {
    r(ctx, WOOD_DARK, x + 1, y - 6, w - 2, h + 5)
    for (let i = 0; i < 3; i++) {
      const sy = y - 4 + i * 6
      r(ctx, '#2f2016', x + 2, sy, w - 4, 5)
      for (let b = 0; b < 5; b++) {
        const shade = ['#b5453f', '#3f7fb5', '#c9a227', '#4f9c5f', '#9a6bc0'][(i * 5 + b) % 5]
        r(ctx, shade, x + 3 + b * 2, sy + 1, 2, 4)
      }
    }
    r(ctx, 'rgba(0,0,0,0.25)', x + 1, y + h - 3, w - 2, 3)
  },
  cabinet(ctx, x, y, w, h) {
    r(ctx, METAL_DARK, x + 2, y - 4, w - 4, h + 3)
    r(ctx, METAL, x + 3, y - 3, w - 6, h + 1)
    for (let i = 0; i < 3; i++) {
      r(ctx, METAL_DARK, x + 3, y - 3 + i * 5, w - 6, 1)
      r(ctx, '#c9ced4', x + w / 2 - 2, y - 1 + i * 5, 4, 1)
    }
    r(ctx, 'rgba(0,0,0,0.25)', x + 2, y + h - 3, w - 4, 3)
  },
  plant(ctx, x, y, _w, h) {
    r(ctx, '#a0663c', x + 5, y + 9, 6, 6)
    r(ctx, '#7d4d2c', x + 5, y + 13, 6, 2)
    r(ctx, '#2f7a45', x + 3, y + 1, 10, 9)
    r(ctx, '#3f9a63', x + 4, y, 8, 6)
    r(ctx, '#57b87c', x + 6, y + 1, 4, 3)
    r(ctx, 'rgba(0,0,0,0.22)', x + 4, y + h - 2, 8, 2)
  },
  sofa(ctx, x, y, w, h, f) {
    r(ctx, f.accent, x + 1, y + 1, w - 2, h - 2)
    r(ctx, 'rgba(0,0,0,0.25)', x + 1, y + 1, w - 2, 4)
    r(ctx, 'rgba(255,255,255,0.14)', x + 3, y + 6, w - 6, 4)
    r(ctx, 'rgba(0,0,0,0.25)', x + 1, y + h - 3, w - 2, 3)
  },
  safe(ctx, x, y, w, h) {
    r(ctx, '#3c4148', x + 2, y + 2, w - 4, h - 4)
    r(ctx, '#565d66', x + 4, y + 4, w - 8, h - 8)
    r(ctx, '#2a2e33', x + w / 2 - 4, y + h / 2 - 4, 8, 8)
    r(ctx, '#c9a227', x + w / 2 - 2, y + h / 2 - 2, 4, 4)
    r(ctx, 'rgba(0,0,0,0.3)', x + 2, y + h - 4, w - 4, 4)
  },
  printer(ctx, x, y, w, h) {
    r(ctx, METAL_DARK, x + 2, y + 2, w - 4, h - 4)
    r(ctx, METAL, x + 3, y + 3, w - 6, 5)
    r(ctx, '#f2f2ee', x + 4, y + 1, w - 8, 3)
    r(ctx, '#3f9a63', x + w - 6, y + 9, 2, 2)
    r(ctx, 'rgba(0,0,0,0.25)', x + 2, y + h - 3, w - 4, 3)
  },
  watercooler(ctx, x, y, _w, h) {
    r(ctx, '#e6e9ec', x + 5, y + 6, 6, h - 8)
    r(ctx, '#7fc7e8', x + 4, y - 2, 8, 8)
    r(ctx, '#a9ddf2', x + 5, y - 1, 6, 4)
    r(ctx, '#4a5058', x + 5, y + 10, 6, 2)
    r(ctx, 'rgba(0,0,0,0.22)', x + 4, y + h - 2, 8, 2)
  },
  server(ctx, x, y, w, h) {
    r(ctx, '#2d3238', x + 2, y + 1, w - 4, h - 2)
    for (let i = 0; i < Math.floor((h - 6) / 4); i++) {
      r(ctx, '#41474e', x + 3, y + 3 + i * 4, w - 6, 3)
      r(ctx, i % 2 ? '#3f9a63' : '#d9a03a', x + w - 6, y + 4 + i * 4, 2, 1)
    }
    r(ctx, 'rgba(0,0,0,0.3)', x + 2, y + h - 3, w - 4, 3)
  },
  board(ctx, x, y, w, h, f) {
    r(ctx, '#2f2a24', x + 1, y + 1, w - 2, h - 2)
    r(ctx, '#f4f1e6', x + 2, y + 2, w - 4, h - 4)
    r(ctx, f.accent, x + 2, y + 2, w - 4, 3)
    for (let i = 0; i < 3; i++) {
      r(ctx, 'rgba(60,60,60,0.45)', x + 5, y + 8 + i * 3, w - 12 - (i % 2) * 4, 1)
    }
  },
  partition(ctx, x, y, w, h) {
    r(ctx, '#7d8a93', x + w - 3, y, 3, h)
    r(ctx, '#95a2aa', x + w - 3, y, 1, h)
    r(ctx, 'rgba(0,0,0,0.22)', x + w - 3, y + h - 2, 3, 2)
  },
  rug(ctx, x, y, w, h, f) {
    r(ctx, f.accent, x + 1, y + 1, w - 2, h - 2)
    r(ctx, 'rgba(255,255,255,0.18)', x + 3, y + 3, w - 6, h - 6)
    r(ctx, f.accent, x + 5, y + 5, w - 10, h - 10)
  },
}

export function drawFurniture(ctx: Ctx, f: Furniture) {
  painters[f.kind](ctx, f.x * TILE, f.y * TILE, f.w * TILE, f.h * TILE, f)
}

/** Text on a `board`, drawn after the board itself so it sits on top. */
export function drawBoardLabel(ctx: Ctx, f: Furniture) {
  if (!f.label) return
  ctx.save()
  ctx.font = '7px "DungGeunMo", "Galmuri11", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#3a342c'
  ctx.fillText(f.label, f.x * TILE + (f.w * TILE) / 2, f.y * TILE + (f.h * TILE) / 2 + 1)
  ctx.restore()
}
