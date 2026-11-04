import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerWebApp } from './web/web-app'

// Pencere başlığında da sürüm görünsün
document.title = `Dolap ${__APP_VERSION__} — Ölçü, Kesim ve Teklif`

registerWebApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
