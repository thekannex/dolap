import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Pencere başlığında da sürüm görünsün
document.title = `Dolap ${__APP_VERSION__} — Ölçü, Kesim ve Teklif`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
