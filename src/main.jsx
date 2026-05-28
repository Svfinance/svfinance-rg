import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from './offline/registerSW'
import { initSyncEngine } from './offline/syncEngine'

// PWA: registra o Service Worker e liga o sync automático offline
registerSW()
initSyncEngine()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)