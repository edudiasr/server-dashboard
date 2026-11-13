const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const intFmt = new Intl.NumberFormat('pt-BR')

/** "há 5 minutos", "há 3 horas", "agora". */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 10) return 'agora'
  if (abs < 60) return rtf.format(seconds, 'second')
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  return rtf.format(Math.round(seconds / 86400), 'day')
}

/** Duração desde um instante: "14 min", "3 h 05 min", "2 d 4 h". */
export function durationSince(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`
  return `${Math.floor(hours / 24)} d ${hours % 24} h`
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function meters(m: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(m)} m`
}

export function integer(n: number): string {
  return intFmt.format(n)
}

/** Valor do ranking no formato da métrica. */
export function score(metric: 'kills' | 'headshots' | 'longest', value: number): string {
  return metric === 'longest' ? meters(value) : integer(value)
}
