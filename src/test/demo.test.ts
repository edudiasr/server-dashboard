import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoSource } from '../api/demo'
import type { KillEvent } from '../api/types'

const NOW = Date.parse('2026-11-13T21:00:00Z')

describe('DemoSource', () => {
  afterEach(() => vi.useRealTimers())

  it('o ranking bate com as kills que ela mesma gerou', async () => {
    const demo = new DemoSource(7, () => NOW)
    const board = await demo.board('kills', 'day', 100)
    const summary = await demo.summary()
    expect(board.reduce((n, e) => n + e.score, 0)).toBe(summary.events)
    expect(board.map((e) => e.rank)).toEqual(board.map((_, i) => i + 1))
    expect(board[0].score).toBeGreaterThanOrEqual(board[board.length - 1].score)
  })

  it('é determinística com a mesma semente', async () => {
    const a = await new DemoSource(3, () => NOW).board('longest', 'all', 5)
    const b = await new DemoSource(3, () => NOW).board('longest', 'all', 5)
    expect(a).toEqual(b)
  })

  it('o histórico do servidor de teste tem quedas e o principal não', async () => {
    const demo = new DemoSource(7, () => NOW)
    const main = await demo.history('DIA-Z')
    const test = await demo.history('Teste')
    expect(main.every((s) => s.up)).toBe(true)
    expect(test.some((s) => !s.up)).toBe(true)
    expect(main).toHaveLength(288) // 24 h de 5 em 5 min
  })

  it('emite kills ao vivo e para quando ninguém mais escuta', async () => {
    vi.useFakeTimers()
    const demo = new DemoSource(7, () => NOW)
    const got: KillEvent[] = []
    const states: string[] = []
    const stop = demo.kills((e) => got.push(e), (s) => states.push(s))

    await vi.advanceTimersByTimeAsync(30_000)
    expect(states).toEqual(['conectando', 'ao vivo'])
    expect(got.length).toBeGreaterThan(3)
    expect(got.every((e) => e.killer_id !== e.victim_id)).toBe(true)

    stop()
    const before = got.length
    await vi.advanceTimersByTimeAsync(30_000)
    expect(got.length).toBe(before)
  })

  it('ficha do jogador acha por id ou por nome', async () => {
    const demo = new DemoSource(7, () => NOW)
    const [first] = await demo.board('kills', 'all', 1)
    expect((await demo.player(first.player_id))?.ranks.kills.rank).toBe(1)
    expect((await demo.player('lobo'))?.name).toBe('Lobo')
    expect(await demo.player('ninguem')).toBeNull()
  })
})
