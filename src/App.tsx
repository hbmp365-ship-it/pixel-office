import { useEffect, useRef, useState } from 'react'
import { OfficeGame } from './game/engine'
import type { LocalInput } from './game/engine'
import { OfficeSocket } from './net/client'
import type { ConnStatus } from './net/client'
import { roomNameAt, spawnPoint } from './game/map'
import { BUBBLE_MS } from './game/constants'
import { Login, loadProfile, saveProfile } from './ui/Login'
import type { Profile } from './ui/Login'
import { ChatPanel } from './ui/ChatPanel'
import { Roster } from './ui/Roster'
import type { RosterEntry } from './ui/Roster'
import { TouchPad } from './ui/TouchPad'
import type { ChatMessage, PlayerState, ServerMsg } from '../shared/protocol'

const KEY_MAP: Record<string, keyof LocalInput> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
}

const STATUS_LABEL: Record<ConnStatus, string> = {
  connecting: '접속 중…',
  open: '연결됨',
  reconnecting: '재연결 중…',
  closed: '연결 끊김',
}

const toEntry = (p: PlayerState): RosterEntry => ({
  id: p.id,
  name: p.name,
  color: p.color,
  room: p.room,
})

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selfId, setSelfId] = useState('')
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const [myRoom, setMyRoom] = useState('')
  const [isTouch, setIsTouch] = useState(false)
  const [savedProfile] = useState(loadProfile)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<OfficeGame | null>(null)
  const socketRef = useRef<OfficeSocket | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  /* ------------------------- game + socket lifecycle ------------------------ */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!profile || !canvas) return

    const game = new OfficeGame(canvas)
    gameRef.current = game
    const spawn = spawnPoint(profile.roomId)

    const socket = new OfficeSocket({
      joinMessage: () => {
        const me = game.self
        const x = me?.x ?? spawn.x
        const y = me?.y ?? spawn.y
        return {
          t: 'join',
          name: profile.name,
          color: profile.color,
          x,
          y,
          room: me?.room ?? roomNameAt(x, y - 2),
        }
      },
      onStatus: setStatus,
      onMessage: (msg: ServerMsg) => {
        switch (msg.t) {
          case 'welcome': {
            game.clear()
            game.setSelf(msg.you)
            for (const p of msg.players) game.upsert(p)
            setSelfId(msg.you.id)
            setMyRoom(msg.you.room)
            setRoster([msg.you, ...msg.players].map(toEntry))
            setMessages(msg.history)
            game.start()
            break
          }
          case 'joined': {
            game.upsert(msg.player)
            setRoster((prev) =>
              prev.some((p) => p.id === msg.player.id) ? prev : [...prev, toEntry(msg.player)],
            )
            break
          }
          case 'moved': {
            game.applyMove(msg.id, msg.x, msg.y, msg.dir, msg.moving, msg.room)
            setRoster((prev) => {
              const found = prev.find((p) => p.id === msg.id)
              if (!found || found.room === msg.room) return prev
              return prev.map((p) => (p.id === msg.id ? { ...p, room: msg.room } : p))
            })
            break
          }
          case 'left': {
            game.remove(msg.id)
            setRoster((prev) => prev.filter((p) => p.id !== msg.id))
            break
          }
          case 'chat': {
            game.setBubble(msg.message.playerId, msg.message.text, BUBBLE_MS)
            setMessages((prev) => [...prev, msg.message].slice(-200))
            break
          }
          case 'error':
          case 'pong':
            break
        }
      },
    })
    socketRef.current = socket

    game.onLocalMove = (p) => {
      socket.send({ t: 'move', x: p.x, y: p.y, dir: p.dir, moving: p.moving, room: p.room })
    }
    game.onRoomChange = setMyRoom

    socket.connect()

    const onResize = () => game.resize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      socket.close()
      game.stop()
      socketRef.current = null
      gameRef.current = null
    }
  }, [profile])

  /* -------------------------------- keyboard -------------------------------- */

  useEffect(() => {
    if (!profile) return

    const typing = () => {
      const el = document.activeElement
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !typing()) {
        e.preventDefault()
        chatInputRef.current?.focus()
        gameRef.current?.releaseInput()
        return
      }
      if (typing()) return
      const action = KEY_MAP[e.code]
      if (!action) return
      e.preventDefault()
      const patch: Partial<LocalInput> = {}
      patch[action] = true
      gameRef.current?.setInput(patch)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (!action) return
      const patch: Partial<LocalInput> = {}
      patch[action] = false
      gameRef.current?.setInput(patch)
    }

    const onBlur = () => gameRef.current?.releaseInput()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [profile])

  /* ---------------------------------- views --------------------------------- */

  if (!profile) {
    return (
      <Login
        initial={savedProfile}
        onEnter={(p) => {
          saveProfile(p)
          setProfile(p)
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">픽셀 오피스</span>
        <span className="here">{myRoom || '복도'}</span>
        <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
      </header>

      <main className="stage">
        <canvas ref={canvasRef} className="viewport" />
        {isTouch && <TouchPad onVector={(x, y) => gameRef.current?.setTouchVector(x, y)} />}
      </main>

      <aside className="sidebar">
        <Roster entries={roster} selfId={selfId} />
        <ChatPanel
          messages={messages}
          selfId={selfId}
          inputRef={chatInputRef}
          onSend={(text) => socketRef.current?.send({ t: 'chat', text })}
        />
      </aside>
    </div>
  )
}
