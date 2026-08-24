// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import '@/lib/ads' // Configureert AdSense uit de env (web-only, dormant zonder ID).
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
