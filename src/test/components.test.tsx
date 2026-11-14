import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Sample } from '../api/types'
import { App } from '../App'
import { KillFeed } from '../components/KillFeed'
import { Leaderboard } from '../components/Leaderboard'
import { PlayersChart } from '../components/PlayersChart'
import { ServerCard } from '../components/ServerCard'
import { FEED_SIZE } from '../hooks/useKillFeed'
import { durationSince, meters, score, timeAgo } from '../lib/format'
import { fakeSource, kill, server } from './fakeSource'

const NOW = Date.parse('2026-11-13T20:00:00Z')

describe('formatação', () => {
  it('escreve tempo e distância do jeito brasileiro', () => {
    expect(meters(812.3)).toBe('812,3 m')
    expect(score('longest', 655)).toBe('655 m')
    expect(score('kills', 1234)).toBe('1.234')
    expect(durationSince('2026-11-13T19:46:00Z', NOW)).toBe('14 min')
    expect(durationSince('2026-11-13T16:55:00Z', NOW)).toBe('3 h 05 min')
    expect(durationSince('2026-11-10T14:00:00Z', NOW)).toBe('3 d 6 h')
    expect(timeAgo('2026-11-13T19:55:00Z', NOW)).toBe('há 5 minutos')
    expect(timeAgo('2026-11-13T19:59:55Z', NOW)).toBe('agora')
  })
})

describe('ServerCard', () => {
  it('mostra jogadores e tempo no ar', () => {
    const { source } = fakeSource()
    render(<ServerCard server={server()} source={source} now={NOW} />)
    expect(screen.getByRole('status')).toHaveTextContent('no ar')
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('/ 60 jogadores')).toBeInTheDocument()
    expect(screen.getByText('3 h 00 min')).toBeInTheDocument()
  })

  it('servidor fora mostra desde quando e o erro', () => {
    const { source } = fakeSource()
    render(<ServerCard server={server({ up: false, since: '2026-11-13T19:46:00Z', last_error: 'não respondeu em 3s' })} source={source} now={NOW} />)
    expect(screen.getByRole('status')).toHaveTextContent('fora do ar')
    expect(screen.getByText('14 min')).toBeInTheDocument()
    expect(screen.getByText(/não respondeu em 3s/)).toBeInTheDocument()
  })

  it('pede o histórico do próprio servidor', async () => {
    const { source } = fakeSource()
    render(<ServerCard server={server({ name: 'Teste' })} source={source} now={NOW} />)
    await waitFor(() => expect(source.history).toHaveBeenCalledWith('Teste', expect.any(AbortSignal)))
  })
})

describe('PlayersChart', () => {
  const samples = (ups: boolean[]): Sample[] =>
    ups.map((up, i) => ({ at: new Date(NOW - (ups.length - i) * 300_000).toISOString(), up, players: up ? 10 + i : 0 }))

  it('desenha faixa vermelha onde o servidor estava fora e não liga a linha por cima', () => {
    const { container } = render(<PlayersChart samples={samples([true, true, false, false, true, true, false])} max={60} />)
    expect(screen.getAllByTestId('down')).toHaveLength(2)
    expect(container.querySelectorAll('.chart__line')).toHaveLength(2)
    expect(screen.getByRole('img')).toHaveAccessibleName('Jogadores nos últimos 30 min, pico de 15')
    expect(screen.getByText('30 min atrás')).toBeInTheDocument()
  })

  it('sem dados suficientes não desenha nada', () => {
    render(<PlayersChart samples={samples([true])} max={60} />)
    expect(screen.getByText(/sem histórico/)).toBeInTheDocument()
  })
})

describe('Leaderboard', () => {
  it('troca de métrica e período pedindo o ranking certo', async () => {
    const { source } = fakeSource({
      'kills:day': [{ rank: 1, player_id: 'a', name: 'Lobo', score: 12 }],
      'longest:week': [{ rank: 1, player_id: 'b', name: 'Corvo', score: 812.3 }],
    })
    render(<Leaderboard source={source} onSelect={vi.fn()} refreshKey={0} />)
    expect(await screen.findByText('Lobo')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Tiro mais longo' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Semana' }))
    expect(await screen.findByText('Corvo')).toBeInTheDocument()
    expect(screen.getByText('812,3 m')).toBeInTheDocument()
    expect(source.board).toHaveBeenLastCalledWith('longest', 'week', 10, expect.any(AbortSignal))
  })

  it('ranking vazio tem mensagem própria', async () => {
    const { source } = fakeSource()
    render(<Leaderboard source={source} onSelect={vi.fn()} refreshKey={0} />)
    expect(await screen.findByText(/Ninguém pontuou/)).toBeInTheDocument()
  })

  it('erro sem dado anterior aparece; com dado anterior, o dado continua na tela', async () => {
    const { source } = fakeSource({ 'kills:day': [{ rank: 1, player_id: 'a', name: 'Lobo', score: 12 }] })
    const { rerender } = render(<Leaderboard source={source} onSelect={vi.fn()} refreshKey={0} />)
    expect(await screen.findByText('Lobo')).toBeInTheDocument()

    source.board.mockRejectedValueOnce(new Error('503'))
    rerender(<Leaderboard source={source} onSelect={vi.fn()} refreshKey={1} />)
    await waitFor(() => expect(source.board).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Lobo')).toBeInTheDocument()
  })
})

describe('KillFeed', () => {
  it('lista com headshot marcado e nomes clicáveis', async () => {
    const onSelect = vi.fn()
    render(<KillFeed events={[kill(1, { headshot: true, weapon: 'SVD', distance: 655.1 })]} state="ao vivo" onSelect={onSelect} />)
    const item = screen.getByRole('listitem')
    expect(within(item).getByText(/SVD · 655,1 m/)).toBeInTheDocument()
    expect(within(item).getByTitle('headshot')).toBeInTheDocument()
    await userEvent.click(within(item).getByRole('button', { name: 'Vitima1' }))
    expect(onSelect).toHaveBeenCalledWith('v1')
  })
})

describe('App', () => {
  it('kills chegando ao vivo aparecem no topo e a lista não passa do limite', async () => {
    const { source, emit, setState } = fakeSource()
    render(<App source={source} />)
    act(() => setState('ao vivo'))
    expect(screen.getByText('ao vivo')).toBeInTheDocument()

    act(() => {
      for (let i = 1; i <= FEED_SIZE + 5; i++) emit(kill(i))
    })
    const feed = screen.getByRole('region', { name: 'Kills ao vivo' })
    const items = within(feed).getAllByRole('listitem')
    expect(items).toHaveLength(FEED_SIZE)
    expect(items[0]).toHaveTextContent(`Matador${FEED_SIZE + 5}`)
  })

  it('cada kill nova recarrega o ranking e o resumo sem esperar o próximo ciclo', async () => {
    const { source, emit } = fakeSource()
    render(<App source={source} />)
    await waitFor(() => expect(source.board).toHaveBeenCalledTimes(1))
    act(() => emit(kill(1)))
    await waitFor(() => expect(source.board).toHaveBeenCalledTimes(2))
    expect(source.summary).toHaveBeenCalledTimes(2)
  })

  it('monitor fora: avisa e mantém o que já tinha', async () => {
    const { source } = fakeSource()
    source.statuses.mockRejectedValue(new Error('/api/monitor/api/status respondeu 502'))
    render(<App source={source} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('O monitor não respondeu')
  })

  it('clicar num jogador abre a ficha', async () => {
    const { source } = fakeSource({ 'kills:day': [{ rank: 1, player_id: '765', name: 'Lobo', score: 12 }] })
    source.player.mockResolvedValue({
      id: '765', name: 'Lobo', kills: 12, deaths: 4, last_seen: new Date().toISOString(),
      ranks: { kills: { rank: 1, score: 12 }, headshots: { rank: 3, score: 2 }, longest: { rank: null, score: null } },
    } as never)
    render(<App source={source} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Lobo' }))

    expect(await screen.findByRole('heading', { name: 'Lobo' })).toBeInTheDocument()
    expect(screen.getByText('3,00')).toBeInTheDocument() // K/D 12/4
    expect(screen.getByText('1º')).toBeInTheDocument()
  })
})
