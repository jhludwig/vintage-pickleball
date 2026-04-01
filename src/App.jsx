import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Players from './pages/Players'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import RoundDetail from './pages/RoundDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/players" replace />} />
        <Route path="players" element={<Players />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:eventId" element={<EventDetail />} />
        <Route path="events/:eventId/rounds/:roundId" element={<RoundDetail />} />
      </Route>
    </Routes>
  )
}
