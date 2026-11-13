import type { BoardEntry, DataSource, KillEvent, LiveState, Metric, Period, PlayerDetail, Sample, ServerStatus, Summary } from './types'

/**
 * Dados de demonstração, pra versão publicada no GitHub Pages (que não tem as APIs por trás).
 * Simula dois servidores e uma partida gerando kills de tempos em tempos; o ranking é
 * calculado de verdade a partir dessas kills, então tudo na tela fica coerente entre si.
 * Os jogadores são inventados.
 */

const NAMES = ['Lobo', 'Corvo', 'Raposa', 'Coruja', 'Tatu', 'Capivara', 'Jaguar', 'Sabiá', 'Lontra', 'Quati', 'Tucano', 'Arara']
const WEAPONS = ['M4-A1', 'AKM', 'Mosin 91/30', 'SVD', 'Machado de lenhador', 'FX-45', 'Winchester 70', 'MP5-K', 'Blaze']
const LONG_RANGE = new Set(['Mosin 91/30', 'SVD', 'Winchester 70', 'Blaze'])

interface Stats {
  id: string
  name: string
  kills: number
  deaths: number
  headshots: number
  longest: number
  lastSeen: string
}

// gerador com semente: a demo começa sempre igual, o que ajuda nos testes e nas capturas de tela
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}

export class DemoSource implements DataSource {
  private readonly random: () => number
  private readonly players: Stats[]
  private readonly listeners = new Set<(e: KillEvent) => void>()
  private readonly now: () => number
  private timer: ReturnType<typeof setTimeout> | undefined
  private events = 0
  private readonly started: number

  constructor(seed = 7, now: () => number = Date.now) {
    this.random = rng(seed)
    this.now = now
    this.started = now()
    this.players = NAMES.map((name, i) => ({
      id: `7656119800001${String(i).padStart(4, '0')}`,
      name,
      kills: 0,
      deaths: 0,
      headshots: 0,
      longest: 0,
      lastSeen: new Date(this.started).toISOString(),
    }))
    for (let i = 0; i < 140; i++) this.kill(new Date(this.started - (140 - i) * 61_000).toISOString())
  }

  private pick<T>(list: T[]): T {
    return list[Math.floor(this.random() * list.length)]
  }

  private kill(at: string): KillEvent {
    // os primeiros nomes matam mais, como num servidor de verdade
    const killer = this.players[Math.floor(this.random() ** 1.7 * this.players.length)]
    let victim = this.pick(this.players)
    while (victim === killer) victim = this.pick(this.players)
    const weapon = this.pick(WEAPONS)
    const distance = Math.round((LONG_RANGE.has(weapon) ? 150 + this.random() * 700 : 2 + this.random() * 140) * 10) / 10
    const headshot = this.random() < (LONG_RANGE.has(weapon) ? 0.35 : 0.18)

    killer.kills++
    killer.headshots += headshot ? 1 : 0
    killer.longest = Math.max(killer.longest, distance)
    killer.lastSeen = victim.lastSeen = at
    victim.deaths++
    this.events++

    return {
      type: 'kill', at, weapon, distance, headshot,
      killer_id: killer.id, killer_name: killer.name,
      victim_id: victim.id, victim_name: victim.name,
    }
  }

  async statuses(): Promise<ServerStatus[]> {
    const now = this.now()
    const minute = Math.floor(now / 60_000)
    const base = {
      latency_ms: 0, consecutive_failures: 0, checks: 2880, failures: 4, known: true,
      last_check: new Date(now).toISOString(), version: '1.28.160049',
    }
    return [
      {
        ...base, name: 'DIA-Z', address: '203.0.113.10:27016', up: true,
        since: new Date(now - 26 * 3_600_000).toISOString(), latency_ms: 18 + (minute % 7),
        server_name: 'DIA-Z | Hardcore', map: 'chernarusplus', players: this.onlineAt(now, 0), max_players: 60,
      },
      {
        ...base, name: 'Teste', address: '203.0.113.10:27116', up: false, consecutive_failures: 5, failures: 97,
        since: new Date(now - 14 * 60_000).toISOString(), players: 0, max_players: 20,
        server_name: 'DIA-Z | Testes', map: 'enoch', last_error: 'a2s: 203.0.113.10:27116 não respondeu em 3s',
      },
    ]
  }

  /** Jogadores online seguindo um ciclo de dia (mais gente à noite). */
  private onlineAt(t: number, server: number): number {
    const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60
    const curve = 0.5 - 0.5 * Math.cos(((hour - 3) / 24) * 2 * Math.PI)
    const wobble = Math.sin(t / 900_000 + server) * 3
    const max = server === 0 ? 60 : 20
    return Math.max(0, Math.min(max, Math.round(4 + curve * (max * 0.7) + wobble)))
  }

  async history(server: string): Promise<Sample[]> {
    const index = server === 'DIA-Z' ? 0 : 1
    const now = this.now()
    const samples: Sample[] = []
    for (let i = 287; i >= 0; i--) {
      const t = now - i * 5 * 60_000
      // o servidor de teste caiu duas vezes: uma de madrugada e agora há pouco
      const down = index === 1 && (i < 3 || (i > 150 && i < 170))
      samples.push({ at: new Date(t).toISOString(), up: !down, players: down ? 0 : this.onlineAt(t, index) })
    }
    return samples
  }

  async board(metric: Metric, period: Period, limit: number): Promise<BoardEntry[]> {
    // "dia" é o placar atual; "semana" e "geral" somam um histórico inventado por cima
    const extra = { day: 0, week: 3, all: 11 }[period]
    const score = (p: Stats, i: number) =>
      metric === 'kills' ? p.kills + extra * (12 - i)
        : metric === 'headshots' ? p.headshots + Math.round(extra * (12 - i) * 0.25)
          : p.longest + (period === 'day' ? 0 : extra * 9)
    return this.players
      .map((p, i) => ({ player_id: p.id, name: p.name, score: Math.round(score(p, i) * 10) / 10 }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((e, i) => ({ ...e, rank: i + 1 }))
  }

  async summary(): Promise<Summary> {
    const [top] = await this.board('kills', 'day', 1)
    const [longest] = await this.board('longest', 'all', 1)
    return { events: this.events, players: this.players.length, top_killer_today: top ?? null, longest_shot: longest ?? null }
  }

  async player(id: string): Promise<PlayerDetail | null> {
    const p = this.players.find((x) => x.id === id || x.name.toLowerCase() === id.toLowerCase())
    if (!p) return null
    const rankOf = async (metric: Metric) => {
      const board = await this.board(metric, 'all', 100)
      const entry = board.find((e) => e.player_id === p.id)
      return { rank: entry?.rank ?? null, score: entry?.score ?? null }
    }
    return {
      id: p.id, name: p.name, kills: p.kills, deaths: p.deaths, last_seen: p.lastSeen,
      ranks: { kills: await rankOf('kills'), headshots: await rankOf('headshots'), longest: await rankOf('longest') },
    }
  }

  kills(onKill: (e: KillEvent) => void, onState: (s: LiveState) => void) {
    this.listeners.add(onKill)
    onState('conectando')
    setTimeout(() => onState('ao vivo'), 400)
    if (!this.timer) this.schedule()
    return () => {
      this.listeners.delete(onKill)
      if (this.listeners.size === 0 && this.timer) {
        clearTimeout(this.timer)
        this.timer = undefined
      }
    }
  }

  private schedule() {
    this.timer = setTimeout(() => {
      const event = this.kill(new Date(this.now()).toISOString())
      this.listeners.forEach((fn) => fn(event))
      this.schedule()
    }, 2500 + this.random() * 3500)
  }
}
