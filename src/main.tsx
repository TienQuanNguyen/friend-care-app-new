import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getPushRegistration } from './lib/pushRegistration'

// Register Service Worker for Web Push Notifications
if ('serviceWorker' in navigator) {
    getPushRegistration()
      .then((reg) => {
        if (import.meta.env.DEV) {
          console.log('[ServiceWorker] Registered successfully:', reg.scope);
        }
      })
      .catch((err) => {
        console.warn('[ServiceWorker] Registration failed:', err);
      });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
