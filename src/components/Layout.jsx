import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const session = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Vintage Club Pickleball</h1>
        {session && (
          <button onClick={handleLogout} className="text-sm text-blue-200 hover:text-white">
            Sign out
          </button>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        <NavLink
          to="/players"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`
          }
        >
          <span className="text-xl">👥</span>
          Players
        </NavLink>
        <NavLink
          to="/events"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`
          }
        >
          <span className="text-xl">📅</span>
          Events
        </NavLink>
      </nav>
    </div>
  )
}
