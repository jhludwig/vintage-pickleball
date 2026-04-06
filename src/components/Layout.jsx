import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const LOGO = 'https://static.clubessential.com/CEFED/_Axis-Website/Sites/VintageClub-2023/images/Logos/LogoColor.svg'

export default function Layout() {
  const session = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-stone-900 text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="Vintage Club" className="h-9 w-auto" />
          <h1 className="text-lg font-semibold tracking-wide">Vintage Club Pickleball</h1>
        </div>
        {session ? (
          <button
            onClick={handleLogout}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Sign in
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
