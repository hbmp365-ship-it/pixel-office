import { AVATAR_COLORS, SKIN_TONES } from './constants'
import type { Dir } from '../../shared/protocol'

type Ctx = CanvasRenderingContext2D

/** Avatar box: 12 wide, 22 tall, anchored at the feet (x = centre, y = ground). */
export const AVATAR_W = 12
export const AVATAR_H = 22

function r(ctx: Ctx, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/**
 * Draws one avatar. `frame` alternates 0/1 for the walk cycle; pass 0 while idle.
 * Everything is axis-aligned rectangles so it stays crisp at any integer zoom.
 */
export function drawAvatar(
  ctx: Ctx,
  cx: number,
  groundY: number,
  colorIndex: number,
  dir: Dir,
  frame: number,
  skinIndex = 0,
) {
  const palette = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const skin = SKIN_TONES[skinIndex % SKIN_TONES.length]
  const x = Math.round(cx) - 6
  const y = Math.round(groundY) - AVATAR_H

  // Contact shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(Math.round(cx), Math.round(groundY) - 1, 6, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Legs: the swing alternates which one leads.
  const swing = frame === 1 ? 1 : 0
  r(ctx, '#39404a', x + 2, y + 16, 3, 6 - swing)
  r(ctx, '#39404a', x + 7, y + 16 + swing, 3, 6 - swing)
  r(ctx, '#23272e', x + 2, y + 21 - swing, 3, 1)
  r(ctx, '#23272e', x + 7, y + 21, 3, 1)

  // Torso.
  r(ctx, palette.dark, x + 1, y + 9, 10, 8)
  r(ctx, palette.body, x + 1, y + 9, 10, 6)
  r(ctx, 'rgba(255,255,255,0.14)', x + 2, y + 9, 8, 1)

  // Arms, offset by facing so the silhouette reads in profile.
  if (dir === 'left') {
    r(ctx, palette.dark, x, y + 10, 2, 6)
    r(ctx, skin, x, y + 15, 2, 2)
  } else if (dir === 'right') {
    r(ctx, palette.dark, x + 10, y + 10, 2, 6)
    r(ctx, skin, x + 10, y + 15, 2, 2)
  } else {
    r(ctx, palette.dark, x, y + 10, 2, 6)
    r(ctx, palette.dark, x + 10, y + 10, 2, 6)
    r(ctx, skin, x, y + 15, 2, 2)
    r(ctx, skin, x + 10, y + 15, 2, 2)
  }

  // Head.
  r(ctx, skin, x + 2, y + 1, 8, 8)
  r(ctx, 'rgba(0,0,0,0.12)', x + 2, y + 8, 8, 1)
  r(ctx, palette.hair, x + 1, y, 10, 3)

  if (dir === 'down') {
    r(ctx, palette.hair, x + 1, y, 10, 4)
    r(ctx, skin, x + 3, y + 3, 6, 1)
    r(ctx, '#2a2118', x + 3, y + 5, 2, 2)
    r(ctx, '#2a2118', x + 7, y + 5, 2, 2)
    r(ctx, 'rgba(0,0,0,0.18)', x + 5, y + 8, 2, 1)
  } else if (dir === 'up') {
    r(ctx, palette.hair, x + 1, y, 10, 7)
    r(ctx, 'rgba(255,255,255,0.10)', x + 3, y + 1, 4, 2)
  } else {
    const facingLeft = dir === 'left'
    r(ctx, palette.hair, x + 1, y, 10, 4)
    r(ctx, palette.hair, facingLeft ? x + 7 : x + 1, y, 4, 6)
    r(ctx, '#2a2118', facingLeft ? x + 3 : x + 7, y + 5, 2, 2)
  }
}

/** Name plate drawn above an avatar. Call with the canvas already scaled. */
export function drawNameTag(ctx: Ctx, cx: number, topY: number, name: string, isSelf: boolean) {
  ctx.save()
  ctx.font = '8px "Galmuri11", "Apple SD Gothic Neo", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = Math.ceil(ctx.measureText(name).width) + 6
  const x = Math.round(cx - w / 2)
  const y = Math.round(topY) - 11
  ctx.fillStyle = isSelf ? 'rgba(217,160,58,0.92)' : 'rgba(18,22,31,0.78)'
  ctx.fillRect(x, y, w, 10)
  ctx.fillStyle = isSelf ? '#221a08' : '#f2f4f8'
  ctx.fillText(name, Math.round(cx), y + 5)
  ctx.restore()
}

/** Speech bubble drawn above the name plate. */
export function drawBubble(ctx: Ctx, cx: number, topY: number, text: string) {
  ctx.save()
  ctx.font = '8px "Galmuri11", "Apple SD Gothic Neo", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const clipped = text.length > 26 ? `${text.slice(0, 26)}…` : text
  const w = Math.ceil(ctx.measureText(clipped).width) + 10
  const x = Math.round(cx - w / 2)
  const y = Math.round(topY) - 25
  ctx.fillStyle = 'rgba(248,249,251,0.96)'
  ctx.fillRect(x, y, w, 12)
  ctx.fillRect(Math.round(cx) - 2, y + 12, 4, 3)
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  ctx.fillRect(x, y + 12, w, 1)
  ctx.fillStyle = '#1a1e26'
  ctx.fillText(clipped, Math.round(cx), y + 6)
  ctx.restore()
}
