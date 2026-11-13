import { useEffect, useState } from 'react'
import type { DataSource, KillEvent, LiveState } from '../api/types'

export const FEED_SIZE = 25

/** Kills ao vivo, da mais nova pra mais antiga, guardando só as últimas FEED_SIZE. */
export function useKillFeed(source: DataSource) {
  const [events, setEvents] = useState<KillEvent[]>([])
  const [state, setState] = useState<LiveState>('conectando')
  const [count, setCount] = useState(0)

  useEffect(() => {
    return source.kills(
      (event) => {
        setEvents((list) => [event, ...list].slice(0, FEED_SIZE))
        setCount((n) => n + 1)
      },
      setState,
    )
  }, [source])

  return { events, state, count }
}
