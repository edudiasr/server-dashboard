import { useCallback, useEffect, useState } from 'react'
import type { DataSource } from './api/types'
import { KillFeed } from './components/KillFeed'
import { Leaderboard } from './components/Leaderboard'
import { PlayerPanel } from './components/PlayerPanel'
import { ServerCard } from './components/ServerCard'
import { useKillFeed } from './hooks/useKillFeed'
import { usePolling } from './hooks/usePolling'
import { integer, meters } from './lib/format'

interface Props {
  source: DataSource
  demo?: boolean
}

export function App({ source, demo = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const feed = useKillFeed(source)

  const fetchStatuses = useCallback((signal: AbortSignal) => source.statuses(signal), [source])
  const fetchSummary = useCallback((signal: AbortSignal) => source.summary(signal), [source])
  const statuses = usePolling(fetchStatuses, 15_000, 'statuses')
  const summary = usePolling(fetchSummary, 30_000, `summary:${feed.count}`)

  // "no ar há 3 h 05 min" precisa andar mesmo sem dado novo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const online = statuses.data?.filter((s) => s.up).reduce((n, s) => n + s.players, 0)

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>Servidores</h1>
          <p className="muted">
            {statuses.data
              ? `${statuses.data.filter((s) => s.up).length} de ${statuses.data.length} no ar · ${integer(online ?? 0)} jogadores agora`
              : statuses.error ? 'sem dados do monitor' : 'carregando…'}
          </p>
        </div>
        {demo && <span className="demo" title="Dados gerados no navegador, sem as APIs por trás">demonstração</span>}
      </header>

      {statuses.error && (
        <p className="error" role="alert">
          O monitor não respondeu ({statuses.error.message}).{statuses.data ? ' Mostrando os últimos dados recebidos.' : ''}
        </p>
      )}

      <section className="servers">
        {statuses.data?.map((s) => <ServerCard key={s.name} server={s} source={source} now={now} />)}
      </section>

      {summary.data && (
        <section className="facts" aria-label="Resumo">
          <div><b>{integer(summary.data.events)}</b><span>kills registradas</span></div>
          <div><b>{integer(summary.data.players)}</b><span>jogadores no ranking</span></div>
          {summary.data.top_killer_today && (
            <div><b>{summary.data.top_killer_today.name}</b><span>mais kills hoje ({integer(summary.data.top_killer_today.score)})</span></div>
          )}
          {summary.data.longest_shot && (
            <div><b>{meters(summary.data.longest_shot.score)}</b><span>tiro mais longo, de {summary.data.longest_shot.name}</span></div>
          )}
        </section>
      )}

      <div className="columns">
        <Leaderboard source={source} onSelect={setSelected} refreshKey={feed.count} />
        <KillFeed events={feed.events} state={feed.state} onSelect={setSelected} />
      </div>

      <PlayerPanel source={source} playerId={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
