import { AVATAR_COLORS } from '../game/constants'
import { rooms } from '../game/map'

export interface RosterEntry {
  id: string
  name: string
  color: number
  room: string
}

const HALLWAY = '복도'

export function Roster({ entries, selfId }: { entries: RosterEntry[]; selfId: string }) {
  const groups = new Map<string, RosterEntry[]>()
  for (const room of rooms) groups.set(room.name, [])
  groups.set(HALLWAY, [])

  for (const entry of entries) {
    const key = entry.room || HALLWAY
    const bucket = groups.get(key)
    if (bucket) bucket.push(entry)
    else groups.set(key, [entry])
  }

  return (
    <div className="roster">
      <div className="roster-head">
        접속자 <strong>{entries.length}</strong>명
      </div>
      <div className="roster-body">
        {[...groups.entries()]
          .filter(([, list]) => list.length > 0)
          .map(([room, list]) => (
            <div key={room} className="roster-group">
              <div className="roster-room">{room}</div>
              {list.map((p) => (
                <div key={p.id} className={`roster-person${p.id === selfId ? ' is-self' : ''}`}>
                  <span
                    className="roster-dot"
                    style={{ background: AVATAR_COLORS[p.color % AVATAR_COLORS.length].body }}
                  />
                  {p.name}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}
