import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

let showUpdateCallback = null

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (showUpdateCallback) showUpdateCallback(true)
  },
})

export function setShowUpdateCallback(cb) {
  showUpdateCallback = cb
}

export function applyUpdate() {
  updateSW(true)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
