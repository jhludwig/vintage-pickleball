import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import RoundDetail from './pages/RoundDetail'
import Leaderboard from './pages/Leaderboard'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/players" replace />} />
        <Route path="players" element={<Players />} />
        <Route path="players/:playerId" element={<PlayerDetail />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:eventId" element={<EventDetail />} />
        <Route path="events/:eventId/rounds/:roundId" element={<RoundDetail />} />
        <Route path="leaderboard" element={<Leaderboard />} />
      </Route>
    </Routes>
  )
}
