// Formatos das duas APIs que o painel consome:
//  - a2s-monitor (Go): estado dos servidores e histórico de jogadores
//  - realtime-leaderboard-redis (Python): ranking e kills ao vivo

export interface ServerStatus {
  name: string
  address: string
  up: boolean
  known: boolean
  since: string
  last_check: string
  latency_ms: number
  server_name?: string
  map?: string
  players: number
  max_players: number
  version?: string
  consecutive_failures: number
  last_error?: string
  checks: number
  failures: number
}

export interface Sample {
  at: string
  up: boolean
  players: number
}

export type Metric = 'kills' | 'headshots' | 'longest'
export type Period = 'day' | 'week' | 'all'

export interface BoardEntry {
  rank: number
  player_id: string
  name: string
  score: number
}

export interface Leader {
  player_id: string
  name: string
  score: number
}

export interface Summary {
  events: number
  players: number
  top_killer_today: Leader | null
  longest_shot: Leader | null
}

export interface KillEvent {
  type: 'kill'
  at: string
  killer_id: string
  killer_name: string
  victim_id: string
  victim_name: string
  weapon: string
  distance: number
  headshot: boolean
}

export interface PlayerDetail {
  id: string
  name: string
  kills: number
  deaths: number
  last_seen: string | null
  ranks: Record<Metric, { rank: number | null; score: number | null }>
}

export type LiveState = 'conectando' | 'ao vivo' | 'reconectando'

/** Tudo que a tela precisa. Implementado pelas APIs de verdade e por uma versão de demonstração. */
export interface DataSource {
  statuses(signal?: AbortSignal): Promise<ServerStatus[]>
  history(server: string, signal?: AbortSignal): Promise<Sample[]>
  board(metric: Metric, period: Period, limit: number, signal?: AbortSignal): Promise<BoardEntry[]>
  summary(signal?: AbortSignal): Promise<Summary>
  /** null quando o jogador não existe */
  player(id: string, signal?: AbortSignal): Promise<PlayerDetail | null>
  /** Assina as kills ao vivo. Devolve a função que cancela a assinatura. */
  kills(onKill: (e: KillEvent) => void, onState: (s: LiveState) => void): () => void
}
