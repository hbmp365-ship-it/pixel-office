/** Size of one map tile in world pixels. The art is authored at this scale. */
export const TILE = 16

/** Player collision box (world pixels), anchored at the feet. */
export const BODY_W = 10
export const BODY_H = 8

/** Walking speed in world pixels per second. */
export const SPEED = 62

/** How often the client pushes its position to the server, in ms. */
export const NET_TICK_MS = 80

/** Remote players are eased toward their last known position over this long. */
export const LERP_MS = 120

/** Chat bubbles float above the avatar for this long. */
export const BUBBLE_MS = 6000

/** Palette for avatars; the index travels over the wire, not the hex value. */
export const AVATAR_COLORS = [
  { name: '코랄', body: '#e0564f', dark: '#a33a35', hair: '#3a2a22' },
  { name: '오션', body: '#3d7fd1', dark: '#2b5a96', hair: '#22303f' },
  { name: '포레스트', body: '#3f9a63', dark: '#2c6e46', hair: '#2e2419' },
  { name: '머스터드', body: '#d9a03a', dark: '#a3762a', hair: '#4a3520' },
  { name: '바이올렛', body: '#8a63c9', dark: '#634593', hair: '#2b2333' },
  { name: '틸', body: '#2fa39b', dark: '#217670', hair: '#1f3330' },
  { name: '로즈', body: '#d3639a', dark: '#9c4672', hair: '#40222f' },
  { name: '스틸', body: '#6b7a8f', dark: '#4a5768', hair: '#2a3038' },
] as const

export const SKIN_TONES = ['#f0c8a0', '#d9a26f', '#a9724a', '#7a4f31'] as const
