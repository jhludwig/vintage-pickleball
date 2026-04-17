import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { RankingsProvider } from './hooks/useRankings'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <RankingsProvider>
          <App />
        </RankingsProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/vintage-pickleball/sw.js')
      .catch(err => console.error('SW registration failed:', err))
  })
}
