import { useState } from 'react'
import { AVATAR_COLORS } from '../game/constants'
import { rooms } from '../game/map'
import { MAX_NAME_LEN } from '../../shared/protocol'

export interface Profile {
  name: string
  color: number
  roomId: string
}

const STORAGE_KEY = 'pixel-office:profile'

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Profile>
    if (typeof parsed.name !== 'string' || !parsed.name) return null
    return {
      name: parsed.name.slice(0, MAX_NAME_LEN),
      color: typeof parsed.color === 'number' ? parsed.color : 0,
      roomId: typeof parsed.roomId === 'string' ? parsed.roomId : rooms[0].id,
    }
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Private browsing or blocked storage: the profile just will not persist.
  }
}

export function Login({ initial, onEnter }: { initial: Profile | null; onEnter: (p: Profile) => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? 0)
  const [roomId, setRoomId] = useState(initial?.roomId ?? rooms[0].id)

  const trimmed = name.trim()
  const canEnter = trimmed.length > 0

  return (
    <div className="login">
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canEnter) return
          onEnter({ name: trimmed.slice(0, MAX_NAME_LEN), color, roomId })
        }}
      >
        <h1>픽셀 오피스</h1>
        <p className="login-sub">이름을 정하고 자리로 들어가세요.</p>

        <label className="field">
          <span>이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LEN}
            placeholder="예: 김민수"
            autoFocus
          />
        </label>

        <div className="field">
          <span>아바타 색</span>
          <div className="swatches">
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={c.name}
                type="button"
                className={`swatch${i === color ? ' is-active' : ''}`}
                style={{ background: c.body }}
                onClick={() => setColor(i)}
                aria-label={c.name}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <label className="field">
          <span>시작 부서</span>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <button className="primary" type="submit" disabled={!canEnter}>
          입장하기
        </button>

        <p className="hint">방향키 또는 WASD로 이동 · Enter로 채팅</p>
      </form>
    </div>
  )
}
