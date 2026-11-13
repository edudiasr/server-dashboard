import { useCallback } from 'react'
import type { DataSource, ServerStatus } from '../api/types'
import { usePolling } from '../hooks/usePolling'
import { durationSince, integer } from '../lib/format'
import { PlayersChart } from './PlayersChart'

interface Props {
  server: ServerStatus
  source: DataSource
  now: number
}

export function ServerCard({ server, source, now }: Props) {
  const fetchHistory = useCallback((signal: AbortSignal) => source.history(server.name, signal), [source, server.name])
  const history = usePolling(fetchHistory, 60_000, `history:${server.name}`)

  const state = !server.known ? 'checando' : server.up ? 'no ar' : 'fora do ar'
  const fill = server.max_players ? Math.min(100, (server.players / server.max_players) * 100) : 0

  return (
    <article className={`server server--${server.known ? (server.up ? 'up' : 'down') : 'unknown'}`}>
      <header className="server__head">
        <div>
          <h3>{server.server_name || server.name}</h3>
          <p className="muted small mono">{server.address}{server.map ? ` · ${server.map}` : ''}</p>
        </div>
        <span className="badge" role="status">{state}</span>
      </header>

      {server.up ? (
        <div className="server__numbers">
          <div>
            <b>{integer(server.players)}</b>
            <span className="muted">/ {integer(server.max_players)} jogadores</span>
            <div className="meter" aria-hidden="true"><i style={{ width: `${fill}%` }} /></div>
          </div>
          <dl>
            <div><dt>resposta</dt><dd>{Math.round(server.latency_ms)} ms</dd></div>
            <div><dt>no ar há</dt><dd>{durationSince(server.since, now)}</dd></div>
            {server.version && <div><dt>versão</dt><dd>{server.version}</dd></div>}
          </dl>
        </div>
      ) : server.known ? (
        <p className="server__down">
          Sem resposta há <b>{durationSince(server.since, now)}</b>
          {server.last_error && <span className="muted small mono"> · {server.last_error}</span>}
        </p>
      ) : (
        <p className="muted">Aguardando a primeira resposta…</p>
      )}

      {history.data && <PlayersChart samples={history.data} max={server.max_players} />}
    </article>
  )
}
