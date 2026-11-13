import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DemoSource } from './api/demo'
import { HttpSource } from './api/http'
import { App } from './App'
import './styles.css'

// VITE_DEMO=1 no build (versão do GitHub Pages) ou ?demo na URL usa dados gerados no navegador
const demo = import.meta.env.VITE_DEMO === '1' || new URLSearchParams(location.search).has('demo')
const source = demo ? new DemoSource() : new HttpSource()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App source={source} demo={demo} />
  </StrictMode>,
)
