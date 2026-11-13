import type { Sample } from '../api/types'

interface Props {
  samples: Sample[]
  max: number
  height?: number
}

const W = 600

/**
 * Jogadores online ao longo do tempo, em SVG puro. Os trechos em que o servidor estava fora
 * aparecem como faixas vermelhas, e a linha é interrompida neles (não liga o antes e o depois
 * como se o servidor estivesse vazio).
 */
export function PlayersChart({ samples, max, height = 120 }: Props) {
  if (samples.length < 2) {
    return <p className="muted small">Ainda sem histórico suficiente.</p>
  }
  const t0 = new Date(samples[0].at).getTime()
  const t1 = new Date(samples[samples.length - 1].at).getTime()
  const top = Math.max(max, ...samples.map((s) => s.players), 1)
  const x = (iso: string) => ((new Date(iso).getTime() - t0) / Math.max(1, t1 - t0)) * W
  const y = (players: number) => height - 4 - (players / top) * (height - 12)

  // quebra a série em trechos contínuos de "no ar"
  const runs: Sample[][] = []
  const downs: Array<[number, number]> = []
  let current: Sample[] = []
  let downStart: number | null = null
  for (const s of samples) {
    if (s.up) {
      current.push(s)
      if (downStart !== null) {
        downs.push([downStart, x(s.at)])
        downStart = null
      }
    } else {
      if (current.length) runs.push(current)
      current = []
      downStart ??= x(s.at)
    }
  }
  if (current.length) runs.push(current)
  if (downStart !== null) downs.push([downStart, W])

  const peak = samples.reduce((a, b) => (b.players > a.players ? b : a))
  const minutes = Math.round((t1 - t0) / 60_000)
  const span = minutes < 90 ? `${minutes} min` : `${Math.round(minutes / 60)} h`

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img"
        aria-label={`Jogadores nos últimos ${span}, pico de ${peak.players}`}>
        {downs.map(([a, b], i) => (
          <rect key={i} className="chart__down" x={a} y={0} width={Math.max(2, b - a)} height={height} data-testid="down" />
        ))}
        {runs.map((run, i) => {
          const line = run.map((s, j) => `${j ? 'L' : 'M'}${x(s.at).toFixed(1)},${y(s.players).toFixed(1)}`).join(' ')
          const area = `${line} L${x(run[run.length - 1].at).toFixed(1)},${height} L${x(run[0].at).toFixed(1)},${height} Z`
          return (
            <g key={i}>
              <path className="chart__area" d={area} />
              <path className="chart__line" d={line} vectorEffect="non-scaling-stroke" />
            </g>
          )
        })}
      </svg>
      <figcaption className="chart__legend">
        <span>{span} atrás</span>
        <span>pico: {peak.players}</span>
        <span>agora</span>
      </figcaption>
    </figure>
  )
}
