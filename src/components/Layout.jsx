import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const HEADER_IMAGE = 'https://www.thevintageclub.com/images/dynamic/getImage.gif?ID=100020072'

export default function Layout() {
  const session = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Header with background image */}
      <header
        className="relative text-white flex items-center justify-between px-4 py-5 overflow-hidden"
        style={{ backgroundImage: `url('${HEADER_IMAGE}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <h1 className="relative z-10 text-xl font-bold tracking-wide drop-shadow">Vintage Club Pickleball</h1>
        {session && (
          <button
            onClick={handleLogout}
            className="relative z-10 text-sm text-white/70 hover:text-white transition-colors"
          >
            Sign out
          </button>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
        <NavLink
          to="/players"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${isActive ? 'text-emerald-600' : 'text-stone-400'}`
          }
        >
          <span className="text-xl mb-0.5">👥</span>
          Players
        </NavLink>
        <NavLink
          to="/events"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${isActive ? 'text-emerald-600' : 'text-stone-400'}`
          }
        >
          <span className="text-xl mb-0.5">📅</span>
          Events
        </NavLink>
      </nav>
    </div>
  )
}
