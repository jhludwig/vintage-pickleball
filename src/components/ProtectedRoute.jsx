import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Spinner from './Spinner'

export default function ProtectedRoute({ children }) {
  const session = useAuth()
  if (session === undefined) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  return children
}
