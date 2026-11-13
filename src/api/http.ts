import type { BoardEntry, DataSource, KillEvent, LiveState, Metric, Period, PlayerDetail, Sample, ServerStatus, Summary } from './types'

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, url: string) {
    super(`${url} respondeu ${status}`)
    this.status = status
  }
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new HttpError(res.status, url)
  return (await res.json()) as T
}

/**
 * As duas APIs reais. Os caminhos são relativos: em desenvolvimento o Vite faz proxy
 * (vite.config.ts) e no docker-compose quem faz é o Nginx, então o navegador nunca fala
 * com outra origem e não precisa de CORS.
 */
export class HttpSource implements DataSource {
  private readonly monitor: string
  private readonly ranking: string

  constructor(monitor = '/api/monitor', ranking = '/api/ranking') {
    this.monitor = monitor
    this.ranking = ranking
  }

  statuses(signal?: AbortSignal) {
    return getJSON<ServerStatus[]>(`${this.monitor}/api/status`, signal)
  }

  history(server: string, signal?: AbortSignal) {
    return getJSON<Sample[]>(`${this.monitor}/api/history/${encodeURIComponent(server)}`, signal)
  }

  board(metric: Metric, period: Period, limit: number, signal?: AbortSignal) {
    const q = new URLSearchParams({ period, limit: String(limit) })
    return getJSON<BoardEntry[]>(`${this.ranking}/boards/${metric}?${q}`, signal)
  }

  summary(signal?: AbortSignal) {
    return getJSON<Summary>(`${this.ranking}/summary`, signal)
  }

  async player(id: string, signal?: AbortSignal) {
    try {
      return await getJSON<PlayerDetail>(`${this.ranking}/players/${encodeURIComponent(id)}`, signal)
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null
      throw e
    }
  }

  kills(onKill: (e: KillEvent) => void, onState: (s: LiveState) => void) {
    // o EventSource reconecta sozinho (a API manda "retry: 3000"); aqui só acompanha o estado
    const es = new EventSource(`${this.ranking}/stream`)
    onState('conectando')
    es.onopen = () => onState('ao vivo')
    es.onerror = () => onState('reconectando')
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as KillEvent
        if (event.type === 'kill') onKill(event)
      } catch {
        // mensagem que não é JSON (não deveria acontecer): ignora em vez de derrubar a tela
      }
    }
    return () => es.close()
  }
}
