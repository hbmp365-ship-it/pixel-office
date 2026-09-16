import { useEffect, useRef, useState } from 'react'
import { AVATAR_COLORS } from '../game/constants'
import { MAX_CHAT_LEN } from '../../shared/protocol'
import type { ChatMessage } from '../../shared/protocol'

function clock(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ChatPanel({
  messages,
  selfId,
  onSend,
  inputRef,
}: {
  messages: ChatMessage[]
  selfId: string
  onSend: (text: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="chat-empty">아직 대화가 없습니다.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-line${m.playerId === selfId ? ' is-self' : ''}`}>
            <span className="chat-time">{clock(m.ts)}</span>
            <span className="chat-name" style={{ color: AVATAR_COLORS[m.color % AVATAR_COLORS.length].body }}>
              {m.name}
              {m.room && <em className="chat-room">{m.room}</em>}
            </span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
      </div>

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          const text = draft.trim()
          if (!text) return
          onSend(text)
          setDraft('')
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          maxLength={MAX_CHAT_LEN}
          placeholder="메시지를 입력하세요 (Enter)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
        />
        <button type="submit" disabled={!draft.trim()}>
          전송
        </button>
      </form>
    </div>
  )
}
