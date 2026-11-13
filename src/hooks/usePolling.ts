import { useEffect, useRef, useState } from 'react'

export interface Polled<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  updatedAt: number | undefined
}

interface Stored<T> {
  data: T | undefined
  error: Error | undefined
  updatedAt: number | undefined
  key: string | undefined // de qual `key` é a última resposta
}

/**
 * Busca agora e de novo a cada `intervalMs`. Se uma busca falhar, mantém o último dado
 * na tela e mostra o erro: um soluço da API não pode apagar o painel.
 * Mudou `key` (ex.: trocou a aba do ranking)? Cancela a busca em andamento e começa outra.
 */
export function usePolling<T>(fetcher: (signal: AbortSignal) => Promise<T>, intervalMs: number, key: string): Polled<T> {
  const [stored, setStored] = useState<Stored<T>>({ data: undefined, error: undefined, updatedAt: undefined, key: undefined })

  // a função mais recente fica num ref: trocar de função não reinicia o intervalo, só `key` reinicia
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    let alive = true
    let controller = new AbortController()

    const run = async () => {
      controller.abort()
      controller = new AbortController()
      try {
        const data = await fetcherRef.current(controller.signal)
        if (alive) setStored({ data, error: undefined, updatedAt: Date.now(), key })
      } catch (e) {
        if (!alive || (e instanceof DOMException && e.name === 'AbortError')) return
        setStored((s) => ({ ...s, error: e instanceof Error ? e : new Error(String(e)), key }))
      }
    }

    void run()
    const id = setInterval(run, intervalMs)
    return () => {
      alive = false
      clearInterval(id)
      controller.abort()
    }
  }, [intervalMs, key])

  // "carregando" é derivado: a última resposta ainda é de outra key (ou não chegou nenhuma)
  return { data: stored.data, error: stored.error, updatedAt: stored.updatedAt, loading: stored.key !== key }
}
