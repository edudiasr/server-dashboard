import { vi } from 'vitest'
import type { BoardEntry, DataSource, KillEvent, LiveState, Metric, Period, ServerStatus } from '../api/types'

export function server(overrides: Partial<ServerStatus> = {}): ServerStatus {
  return {
    name: 'DIA-Z', address: '203.0.113.10:27016', up: true, known: true,
    since: '2026-11-13T17:00:00Z', last_check: '2026-11-13T20:00:00Z', latency_ms: 21.4,
    server_name: 'DIA-Z | Hardcore', map: 'chernarusplus', players: 23, max_players: 60,
    version: '1.28.160049', consecutive_failures: 0, checks: 100, failures: 0, ...overrides,
  }
}

export function kill(n: number, overrides: Partial<KillEvent> = {}): KillEvent {
  return {
    type: 'kill', at: new Date(Date.UTC(2026, 10, 13, 20, 0, n)).toISOString(),
    killer_id: `k${n}`, killer_name: `Matador${n}`, victim_id: `v${n}`, victim_name: `Vitima${n}`,
    weapon: 'M4-A1', distance: 100 + n, headshot: false, ...overrides,
  }
}

/** Fonte controlada pelo teste: as respostas são mocks e as kills são emitidas com `emit`. */
export function fakeSource(boards: Partial<Record<`${Metric}:${Period}`, BoardEntry[]>> = {}) {
  let onKill: ((e: KillEvent) => void) | undefined
  let onState: ((s: LiveState) => void) | undefined
  const source = {
    statuses: vi.fn(async () => [server()]),
    history: vi.fn(async () => []),
    board: vi.fn(async (metric: Metric, period: Period) => boards[`${metric}:${period}`] ?? []),
    summary: vi.fn(async () => ({ events: 0, players: 0, top_killer_today: null, longest_shot: null })),
    player: vi.fn(async () => null),
    kills: vi.fn((k: (e: KillEvent) => void, s: (st: LiveState) => void) => {
      onKill = k
      onState = s
      s('conectando')
      return vi.fn()
    }),
  } satisfies DataSource
  return {
    source,
    emit: (e: KillEvent) => onKill?.(e),
    setState: (s: LiveState) => onState?.(s),
  }
}
