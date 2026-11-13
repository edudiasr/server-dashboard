import { useEffect, useRef, useState } from 'react'
import type { DataSource, PlayerDetail } from '../api/types'
import { integer, score, timeAgo } from '../lib/format'

interface Props {
  source: DataSource
  playerId: string | null
  onClose: () => void
}

type View = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error'; message: string } | { kind: 'ok'; player: PlayerDetail }

/** Ficha do jogador num <dialog> nativo: foco, Esc e fundo escurecido vêm de graça do navegador. */
export function PlayerPanel({ source, playerId, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  // a resposta guarda de qual jogador ela é; se o jogador mudou e ela ainda não chegou, está carregando
  const [result, setResult] = useState<{ id: string; view: View } | null>(null)
  const view: View = result && result.id === playerId ? result.view : { kind: 'loading' }

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (playerId && !el.open) el.showModal?.()
    if (!playerId && el.open) el.close?.()
  }, [playerId])

  useEffect(() => {
    if (!playerId) return
    const controller = new AbortController()
    source.player(playerId, controller.signal).then(
      (player) => setResult({ id: playerId, view: player ? { kind: 'ok', player } : { kind: 'missing' } }),
      (e: Error) => { if (e.name !== 'AbortError') setResult({ id: playerId, view: { kind: 'error', message: e.message } }) },
    )
    return () => controller.abort()
  }, [source, playerId])

  return (
    <dialog ref={dialog} className="player" onClose={onClose} aria-labelledby="player-title">
      {view.kind === 'loading' && <p className="muted">Carregando…</p>}
      {view.kind === 'missing' && <p>Esse jogador ainda não tem nenhuma kill ou morte registrada.</p>}
      {view.kind === 'error' && <p className="error">Erro: {view.message}</p>}
      {view.kind === 'ok' && (
        <>
          <h2 id="player-title">{view.player.name}</h2>
          <p className="muted small mono">{view.player.id}</p>
          <dl className="player__stats">
            <div><dt>kills</dt><dd>{integer(view.player.kills)}</dd></div>
            <div><dt>mortes</dt><dd>{integer(view.player.deaths)}</dd></div>
            <div><dt>K/D</dt><dd>{(view.player.kills / Math.max(1, view.player.deaths)).toFixed(2).replace('.', ',')}</dd></div>
          </dl>
          <table className="player__ranks">
            <thead><tr><th>Ranking geral</th><th>posição</th><th>valor</th></tr></thead>
            <tbody>
              {(['kills', 'headshots', 'longest'] as const).map((m) => {
                const r = view.player.ranks[m]
                return (
                  <tr key={m}>
                    <td>{{ kills: 'Kills', headshots: 'Headshots', longest: 'Tiro mais longo' }[m]}</td>
                    <td>{r.rank ? `${r.rank}º` : '—'}</td>
                    <td>{r.score !== null ? score(m, r.score) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {view.player.last_seen && <p className="muted small">Última atividade {timeAgo(view.player.last_seen)}.</p>}
        </>
      )}
      <form method="dialog"><button className="btn">Fechar</button></form>
    </dialog>
  )
}
