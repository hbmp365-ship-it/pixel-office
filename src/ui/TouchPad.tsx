import { useRef, useState } from 'react'

const RADIUS = 46

/**
 * Thumb stick for touch devices. Reports a normalised vector; the engine treats
 * it exactly like keyboard input, so both can be used at once.
 */
export function TouchPad({ onVector }: { onVector: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const update = (clientX: number, clientY: number) => {
    const el = base.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy) || 1
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS
      dy = (dy / dist) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    onVector(dx / RADIUS, dy / RADIUS)
  }

  const release = () => {
    setKnob({ x: 0, y: 0 })
    onVector(0, 0)
  }

  return (
    <div
      ref={base}
      className="touchpad"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e.clientX, e.clientY)
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="touchpad-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}
