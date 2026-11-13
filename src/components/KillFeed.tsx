import type { KillEvent, LiveState } from '../api/types'
import { clock, meters } from '../lib/format'

interface Props {
  events: KillEvent[]
  state: LiveState
  onSelect: (playerId: string) => void
}

export function KillFeed({ events, state, onSelect }: Props) {
  return (
    <section className="panel" aria-labelledby="feed-title">
      <header className="panel__head">
        <h2 id="feed-title">Kills ao vivo</h2>
        <span className={`live live--${state === 'ao vivo' ? 'on' : 'off'}`} role="status">{state}</span>
      </header>
      {events.length === 0 ? (
        <p className="muted empty">Nenhuma kill desde que a página abriu. Elas aparecem aqui na hora.</p>
      ) : (
        <ul className="feed" aria-live="polite">
          {events.map((e) => (
            <li key={`${e.at}-${e.killer_id}-${e.victim_id}`}>
              <time className="mono muted small" dateTime={e.at}>{clock(e.at)}</time>
              <span>
                <button className="link" onClick={() => onSelect(e.killer_id)}>{e.killer_name}</button>
                <span className="muted"> → </span>
                <button className="link" onClick={() => onSelect(e.victim_id)}>{e.victim_name}</button>
              </span>
              <span className="feed__weapon">
                {e.weapon} · {meters(e.distance)}
                {e.headshot && <span className="tag" title="headshot">HS</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
