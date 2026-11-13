import { useCallback, useState } from 'react'
import type { DataSource, Metric, Period } from '../api/types'
import { usePolling } from '../hooks/usePolling'
import { score } from '../lib/format'

const METRICS: Array<[Metric, string]> = [['kills', 'Kills'], ['headshots', 'Headshots'], ['longest', 'Tiro mais longo']]
const PERIODS: Array<[Period, string]> = [['day', 'Hoje'], ['week', 'Semana'], ['all', 'Geral']]

interface Props {
  source: DataSource
  onSelect: (playerId: string) => void
  /** muda a cada kill nova: força recarregar o ranking na hora em vez de esperar o próximo ciclo */
  refreshKey: number
}

export function Leaderboard({ source, onSelect, refreshKey }: Props) {
  const [metric, setMetric] = useState<Metric>('kills')
  const [period, setPeriod] = useState<Period>('day')
  const fetchBoard = useCallback((signal: AbortSignal) => source.board(metric, period, 10, signal), [source, metric, period])
  const board = usePolling(fetchBoard, 30_000, `${metric}:${period}:${refreshKey}`)

  return (
    <section className="panel" aria-labelledby="ranking-title">
      <header className="panel__head">
        <h2 id="ranking-title">Ranking</h2>
        <div className="segmented" role="tablist" aria-label="Período">
          {PERIODS.map(([value, label]) => (
            <button key={value} role="tab" aria-selected={period === value} onClick={() => setPeriod(value)}>{label}</button>
          ))}
        </div>
      </header>
      <div className="tabs" role="tablist" aria-label="Métrica">
        {METRICS.map(([value, label]) => (
          <button key={value} role="tab" aria-selected={metric === value} onClick={() => setMetric(value)}>{label}</button>
        ))}
      </div>

      {board.error && !board.data && <p className="error">Não deu pra carregar o ranking ({board.error.message}).</p>}
      {board.data && board.data.length === 0 && <p className="muted empty">Ninguém pontuou nesse período ainda.</p>}
      {board.data && board.data.length > 0 && (
        <ol className="board">
          {board.data.map((e) => (
            <li key={e.player_id} className={e.rank <= 3 ? `board__top board__top--${e.rank}` : undefined}>
              <span className="board__rank">{e.rank}</span>
              <button className="link board__name" onClick={() => onSelect(e.player_id)}>{e.name}</button>
              <span className="board__score">{score(metric, e.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
