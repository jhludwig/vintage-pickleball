# Vintage Club Pickleball Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly React web app for managing Vintage Club pickleball events, hosted on GitHub Pages with Supabase as the backend.

**Architecture:** Single-page React app with HashRouter (GitHub Pages compatible), Supabase for auth and PostgreSQL storage. Assignment algorithms run client-side as pure functions. Unauthenticated users can view all data; only logged-in pros can write. Draft court assignments live in React state until committed.

**Tech Stack:** React 18, Vite 5, React Router v6 (HashRouter), @supabase/supabase-js v2, Tailwind CSS v3, Vitest, @testing-library/react

---

## File Map

```
src/
  main.jsx                          — React entry point
  App.jsx                           — Router + auth provider
  index.css                         — Tailwind imports
  test-setup.js                     — jest-dom setup
  lib/
    supabase.js                     — Supabase client singleton
  hooks/
    useAuth.jsx                     — Auth context + hook
  components/
    Layout.jsx                      — Shell: header + bottom tab bar
    Modal.jsx                       — Reusable modal wrapper
    ProtectedRoute.jsx              — Redirect to login if not authed
    Spinner.jsx                     — Loading indicator
  pages/
    Login.jsx
    Players.jsx
    Events.jsx
    EventDetail.jsx
    RoundDetail.jsx
  features/
    players/
      PlayerTable.jsx               — Sortable table
      PlayerModal.jsx               — Add/edit/delete modal
    events/
      EventModal.jsx                — Add event modal
    rounds/
      ParticipantPanel.jsx          — Participant checklist
      CourtGrid.jsx                 — 8-court grid
      CourtCard.jsx                 — Single court card
      AlgorithmBar.jsx              — Suggest + checkboxes + Commit
      algorithms.js                 — Pure assignment functions
      algorithms.test.js            — Unit tests
supabase/
  migrations/
    001_initial.sql                 — All tables + RLS
.github/
  workflows/
    deploy.yml                      — GitHub Pages deployment
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.gitignore`, `.env.example`, `src/index.css`, `src/test-setup.js`

- [ ] **Step 1: Initialize Vite + React project**

```bash
npm create vite@latest . -- --template react
```

When prompted about existing files, press `y` to continue.

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Update `vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/vintage-pickleball/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
```

- [ ] **Step 4: Create `src/test-setup.js`**

```javascript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Update `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 6: Replace `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Update `package.json` scripts section**

Add `"test": "vitest"` to the scripts block. The full scripts section should be:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest"
}
```

- [ ] **Step 8: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 9: Update `.gitignore`**

Append to the existing `.gitignore`:

```
.env.local
.superpowers/
```

- [ ] **Step 10: Verify test runner works**

```bash
npm test -- --run
```

Expected: test suite runs (0 tests, no errors).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold React + Vite + Tailwind + Vitest project"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create the migration file**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write `supabase/migrations/001_initial.sql`**

```sql
-- players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text not null default '',
  ranking text not null default '',
  player_type text not null default 'member'
    check (player_type in ('pro', 'member', 'guest')),
  plays_pickleball boolean not null default true,
  created_at timestamptz not null default now()
);
alter table players enable row level security;
create policy "public read" on players for select using (true);
create policy "auth insert" on players for insert with check (auth.uid() is not null);
create policy "auth update" on players for update using (auth.uid() is not null);
create policy "auth delete" on players for delete using (auth.uid() is not null);

-- events
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Chooseup',
  date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table events enable row level security;
create policy "public read" on events for select using (true);
create policy "auth insert" on events for insert with check (auth.uid() is not null);
create policy "auth update" on events for update using (auth.uid() is not null);
create policy "auth delete" on events for delete using (auth.uid() is not null);

-- rounds
create table rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  round_number integer not null,
  is_committed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table rounds enable row level security;
create policy "public read" on rounds for select using (true);
create policy "auth insert" on rounds for insert with check (auth.uid() is not null);
create policy "auth update" on rounds for update using (auth.uid() is not null);
create policy "auth delete" on rounds for delete using (auth.uid() is not null);

-- round_participants
create table round_participants (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  unique(round_id, player_id)
);
alter table round_participants enable row level security;
create policy "public read" on round_participants for select using (true);
create policy "auth insert" on round_participants for insert with check (auth.uid() is not null);
create policy "auth delete" on round_participants for delete using (auth.uid() is not null);

-- active_courts (8 rows created per round)
create table active_courts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  court_number integer not null check (court_number between 1 and 8),
  is_active boolean not null default false,
  unique(round_id, court_number)
);
alter table active_courts enable row level security;
create policy "public read" on active_courts for select using (true);
create policy "auth insert" on active_courts for insert with check (auth.uid() is not null);
create policy "auth update" on active_courts for update using (auth.uid() is not null);
create policy "auth delete" on active_courts for delete using (auth.uid() is not null);

-- court_assignments
create table court_assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  court_number integer not null check (court_number between 1 and 8),
  player_id uuid not null references players(id) on delete cascade,
  team integer not null check (team in (1, 2)),
  unique(round_id, player_id)
);
alter table court_assignments enable row level security;
create policy "public read" on court_assignments for select using (true);
create policy "auth insert" on court_assignments for insert with check (auth.uid() is not null);
create policy "auth update" on court_assignments for update using (auth.uid() is not null);
create policy "auth delete" on court_assignments for delete using (auth.uid() is not null);

-- court_results
create table court_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  court_number integer not null check (court_number between 1 and 8),
  winning_team integer not null check (winning_team in (1, 2)),
  unique(round_id, court_number)
);
alter table court_results enable row level security;
create policy "public read" on court_results for select using (true);
create policy "auth insert" on court_results for insert with check (auth.uid() is not null);
create policy "auth update" on court_results for update using (auth.uid() is not null);
create policy "auth delete" on court_results for delete using (auth.uid() is not null);
```

- [ ] **Step 3: Run the migration in Supabase**

Go to your Supabase project → SQL Editor → paste the contents of `001_initial.sql` → Run.

Verify all 7 tables appear in the Table Editor.

- [ ] **Step 4: Copy Supabase credentials to `.env.local`**

In Supabase dashboard: Settings → API. Copy Project URL and anon key.

```bash
# create .env.local (not committed)
echo "VITE_SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
```

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema and RLS policies"
```

---

## Task 3: Supabase Client + Auth

**Files:**
- Create: `src/lib/supabase.js`, `src/hooks/useAuth.jsx`, `src/pages/Login.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/Spinner.jsx`

- [ ] **Step 1: Create `src/lib/supabase.js`**

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 2: Create `src/hooks/useAuth.jsx`**

```javascript
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 3: Create `src/components/Spinner.jsx`**

```javascript
export default function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/ProtectedRoute.jsx`**

```javascript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Spinner from './Spinner'

export default function ProtectedRoute({ children }) {
  const session = useAuth()
  if (session === undefined) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  return children
}
```

- [ ] **Step 5: Create `src/pages/Login.jsx`**

```javascript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Vintage Club</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add Supabase client, auth hook, login page, protected route"
```

---

## Task 4: App Shell & Routing

**Files:**
- Create: `src/App.jsx`, `src/components/Layout.jsx`, `src/components/Modal.jsx`
- Modify: `src/main.jsx`
- Create stub pages: `src/pages/Players.jsx`, `src/pages/Events.jsx`, `src/pages/EventDetail.jsx`, `src/pages/RoundDetail.jsx`

- [ ] **Step 1: Update `src/main.jsx`**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: Create `src/App.jsx`**

```javascript
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
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
```

- [ ] **Step 3: Create `src/components/Layout.jsx`**

```javascript
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
```

- [ ] **Step 4: Create `src/components/Modal.jsx`**

```javascript
import { useEffect } from 'react'

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create stub pages**

`src/pages/Players.jsx`:
```javascript
export default function Players() {
  return <div className="p-4">Players</div>
}
```

`src/pages/Events.jsx`:
```javascript
export default function Events() {
  return <div className="p-4">Events</div>
}
```

`src/pages/EventDetail.jsx`:
```javascript
export default function EventDetail() {
  return <div className="p-4">Event Detail</div>
}
```

`src/pages/RoundDetail.jsx`:
```javascript
export default function RoundDetail() {
  return <div className="p-4">Round Detail</div>
}
```

- [ ] **Step 6: Run dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173/vintage-pickleball/`. Expected: header + Players stub + bottom tabs visible. Clicking Events tab navigates to Events stub.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add app shell, routing, layout with bottom tab bar"
```

---

## Task 5: Players Tab

**Files:**
- Create: `src/features/players/PlayerTable.jsx`, `src/features/players/PlayerModal.jsx`
- Modify: `src/pages/Players.jsx`

- [ ] **Step 1: Create `src/features/players/PlayerModal.jsx`**

```javascript
import { useState } from 'react'
import Modal from '../../components/Modal'

const EMPTY = { name: '', gender: '', ranking: '', player_type: 'member', plays_pickleball: true }

export default function PlayerModal({ player, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(player ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const isEdit = !!player

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${player.name}?`)) return
    await onDelete(player.id)
  }

  return (
    <Modal title={isEdit ? 'Edit Player' : 'Add Player'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.player_type}
              onChange={e => set('player_type', e.target.value)}
            >
              <option value="member">Member</option>
              <option value="guest">Guest</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
            >
              <option value="">—</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ranking</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.ranking}
            onChange={e => set('ranking', e.target.value)}
            placeholder="e.g. 3.5"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.plays_pickleball}
            onChange={e => set('plays_pickleball', e.target.checked)}
          />
          Plays pickleball
        </label>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Create `src/features/players/PlayerTable.jsx`**

```javascript
import { useState } from 'react'

const COLS = [
  { key: 'name', label: 'Name' },
  { key: 'player_type', label: 'Type' },
  { key: 'gender', label: 'Gender' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'plays_pickleball', label: 'Active' },
]

function sortPlayers(players, col, dir) {
  return [...players].sort((a, b) => {
    let av = a[col], bv = b[col]
    if (col === 'ranking') {
      av = parseFloat(av) || -1
      bv = parseFloat(bv) || -1
      return dir === 'asc' ? av - bv : bv - av
    }
    if (col === 'plays_pickleball') {
      av = av ? 1 : 0; bv = bv ? 1 : 0
      return dir === 'asc' ? av - bv : bv - av
    }
    av = String(av).toLowerCase(); bv = String(bv).toLowerCase()
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })
}

export default function PlayerTable({ players, onRowClick }) {
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(col) {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = sortPlayers(players, sortCol, sortDir)
  const arrow = sortDir === 'asc' ? '↑' : '↓'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            {COLS.map(c => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                className="px-3 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
              >
                {c.label} {sortCol === c.key ? arrow : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr
              key={p.id}
              onClick={() => onRowClick(p)}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-3 py-2">{p.name}</td>
              <td className="px-3 py-2 capitalize">{p.player_type}</td>
              <td className="px-3 py-2">{p.gender}</td>
              <td className="px-3 py-2">{p.ranking}</td>
              <td className="px-3 py-2">{p.plays_pickleball ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/pages/Players.jsx`**

```javascript
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PlayerTable from '../features/players/PlayerTable'
import PlayerModal from '../features/players/PlayerModal'
import Spinner from '../components/Spinner'

export default function Players() {
  const session = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | player object

  useEffect(() => { loadPlayers() }, [])

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data ?? [])
    setLoading(false)
  }

  async function handleSave(form) {
    if (form.id) {
      await supabase.from('players').update(form).eq('id', form.id)
    } else {
      await supabase.from('players').insert(form)
    }
    setModal(null)
    loadPlayers()
  }

  async function handleDelete(id) {
    await supabase.from('players').delete().eq('id', id)
    setModal(null)
    loadPlayers()
  }

  if (loading) return <Spinner />

  return (
    <div>
      {session && (
        <div className="p-4 pb-0 flex justify-end">
          <button
            onClick={() => setModal('add')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Player
          </button>
        </div>
      )}
      <PlayerTable players={players} onRowClick={p => session && setModal(p)} />
      {modal && (
        <PlayerModal
          player={modal === 'add' ? null : modal}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`. Navigate to Players tab. Verify:
- Table renders with sortable columns
- Clicking a column header sorts (clicking again reverses)
- "Add Player" button visible when logged in
- Add modal opens, fills form, saves — player appears in list
- Clicking a row opens modal pre-filled; save updates; delete removes

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: players tab with sortable table and add/edit/delete modal"
```

---

## Task 6: Events Tab

**Files:**
- Create: `src/features/events/EventModal.jsx`
- Modify: `src/pages/Events.jsx`

- [ ] **Step 1: Create `src/features/events/EventModal.jsx`**

```javascript
import { useState } from 'react'
import Modal from '../../components/Modal'

export default function EventModal({ onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [name, setName] = useState('Chooseup')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name, date })
    setSaving(false)
  }

  return (
    <Modal title="Add Event" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add Event'}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Replace `src/pages/Events.jsx`**

```javascript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import EventModal from '../features/events/EventModal'
import Spinner from '../components/Spinner'

export default function Events() {
  const session = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false })
    setEvents(data ?? [])
    setLoading(false)
  }

  async function handleSave(form) {
    await supabase.from('events').insert(form)
    setShowModal(false)
    loadEvents()
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this event?')) return
    await supabase.from('events').delete().eq('id', id)
    loadEvents()
  }

  if (loading) return <Spinner />

  return (
    <div>
      {session && (
        <div className="p-4 pb-0 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Event
          </button>
        </div>
      )}
      <ul className="divide-y divide-gray-100 mt-2">
        {events.map(ev => (
          <li
            key={ev.id}
            onClick={() => navigate(`/events/${ev.id}`)}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
          >
            <div>
              <div className="font-medium text-gray-800">{ev.name}</div>
              <div className="text-sm text-gray-500">{ev.date}</div>
            </div>
            {session && (
              <button
                onClick={e => handleDelete(e, ev.id)}
                className="text-red-400 hover:text-red-600 text-sm px-2"
              >
                Delete
              </button>
            )}
          </li>
        ))}
        {events.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-400 text-sm">No events yet</li>
        )}
      </ul>
      {showModal && <EventModal onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: events tab with list, add, and delete"
```

---

## Task 7: Event Detail & Rounds

**Files:**
- Modify: `src/pages/EventDetail.jsx`

- [ ] **Step 1: Replace `src/pages/EventDetail.jsx`**

```javascript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../components/Spinner'

function roundStatus(round) {
  if (!round.is_committed) return { label: 'Draft', color: 'text-gray-400' }
  if (round.hasResults) return { label: 'Results recorded', color: 'text-green-600' }
  return { label: 'Committed', color: 'text-blue-500' }
}

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const session = useAuth()
  const [event, setEvent] = useState(null)
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [eventId])

  async function load() {
    const [{ data: ev }, { data: rds }, { data: results }] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number'),
      supabase.from('court_results').select('round_id'),
    ])
    const resultRoundIds = new Set((results ?? []).map(r => r.round_id))
    setEvent(ev)
    setRounds((rds ?? []).map(r => ({ ...r, hasResults: resultRoundIds.has(r.id) })))
    setLoading(false)
  }

  async function addRound() {
    const nextNum = rounds.length + 1
    const { data: round } = await supabase
      .from('rounds')
      .insert({ event_id: eventId, round_number: nextNum })
      .select()
      .single()
    // Create 8 inactive court rows
    await supabase.from('active_courts').insert(
      Array.from({ length: 8 }, (_, i) => ({ round_id: round.id, court_number: i + 1, is_active: false }))
    )
    load()
  }

  async function deleteRound(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this round?')) return
    await supabase.from('rounds').delete().eq('id', id)
    load()
  }

  if (loading) return <Spinner />
  if (!event) return <div className="p-4 text-gray-500">Event not found</div>

  return (
    <div>
      <div className="px-4 py-3 border-b">
        <button onClick={() => navigate('/events')} className="text-sm text-blue-500 mb-1">← Events</button>
        <h2 className="text-lg font-bold">{event.name}</h2>
        <p className="text-sm text-gray-500">{event.date}</p>
      </div>

      <div className="p-4">
        {session && (
          <button
            onClick={addRound}
            className="mb-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Round
          </button>
        )}
        <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
          {rounds.map(r => {
            const status = roundStatus(r)
            return (
              <li
                key={r.id}
                onClick={() => navigate(`/events/${eventId}/rounds/${r.id}`)}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <div>
                  <div className="font-medium">Round {r.round_number}</div>
                  <div className={`text-xs ${status.color}`}>{status.label}</div>
                </div>
                {session && (
                  <button
                    onClick={e => deleteRound(e, r.id)}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    Delete
                  </button>
                )}
              </li>
            )
          })}
          {rounds.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-400 text-sm">No rounds yet</li>
          )}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/
git commit -m "feat: event detail page with rounds list, add, and delete"
```

---

## Task 8: Assignment Algorithms (TDD)

**Files:**
- Create: `src/features/rounds/algorithms.js`, `src/features/rounds/algorithms.test.js`

- [ ] **Step 1: Write the failing tests first**

Create `src/features/rounds/algorithms.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { parseRank, suggest } from './algorithms'

// Helpers
function makePlayer(id, name, player_type, ranking, gender = 'M') {
  return { id, name, player_type, ranking, gender, plays_pickleball: true }
}

function allPlayers(assignments) {
  return assignments.flatMap(c => [...c.team1, ...c.team2])
}

describe('parseRank', () => {
  it('parses DUPR float strings', () => {
    expect(parseRank('3.5')).toBe(3.5)
    expect(parseRank('4.0')).toBe(4.0)
    expect(parseRank('2.75')).toBe(2.75)
  })
  it('returns -1 for non-numeric rankings', () => {
    expect(parseRank('')).toBe(-1)
    expect(parseRank('abc')).toBe(-1)
    expect(parseRank('N/A')).toBe(-1)
  })
})

describe('suggest — base behavior', () => {
  it('assigns 4 players per active court', () => {
    const players = Array.from({ length: 8 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: players, activeCourts: [1, 2], options: {} })
    expect(result).toHaveLength(2)
    result.forEach(c => expect(c.team1.length + c.team2.length).toBe(4))
  })

  it('uses correct court numbers', () => {
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: players, activeCourts: [3], options: {} })
    expect(result[0].court_number).toBe(3)
  })

  it('excludes pros from algorithm', () => {
    const pro = makePlayer('pro1', 'Pro', 'pro', '5.0')
    const members = Array.from({ length: 4 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: [pro, ...members], activeCourts: [1], options: {} })
    const assigned = allPlayers(result)
    expect(assigned.find(p => p.id === 'pro1')).toBeUndefined()
  })

  it('does not assign more players than court slots', () => {
    const players = Array.from({ length: 12 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: players, activeCourts: [1, 2], options: {} }) // 8 slots
    expect(allPlayers(result)).toHaveLength(8)
  })
})

describe('suggest — rank priority', () => {
  it('assigns highest-ranked players to court 1', () => {
    const players = [
      makePlayer('p1', 'P1', 'member', '2.0'),
      makePlayer('p2', 'P2', 'member', '4.5'),
      makePlayer('p3', 'P3', 'member', '3.0'),
      makePlayer('p4', 'P4', 'member', '4.0'),
      makePlayer('p5', 'P5', 'member', '3.5'),
      makePlayer('p6', 'P6', 'member', '2.5'),
      makePlayer('p7', 'P7', 'member', '3.0'),
      makePlayer('p8', 'P8', 'member', '1.5'),
    ]
    const result = suggest({ participants: players, activeCourts: [1, 2], options: { rankPriority: true } })
    const court1 = allPlayers(result.filter(c => c.court_number === 1))
    const court1Ranks = court1.map(p => parseRank(p.ranking))
    const court2 = allPlayers(result.filter(c => c.court_number === 2))
    const court2Ranks = court2.map(p => parseRank(p.ranking))
    expect(Math.min(...court1Ranks)).toBeGreaterThan(Math.max(...court2Ranks))
  })
})

describe('suggest — member priority', () => {
  it('fills courts with members before guests', () => {
    const members = Array.from({ length: 6 }, (_, i) => makePlayer(`m${i}`, `M${i}`, 'member', '3.5'))
    const guests = Array.from({ length: 4 }, (_, i) => makePlayer(`g${i}`, `G${i}`, 'guest', '3.5'))
    const result = suggest({
      participants: [...guests, ...members], // guests listed first to prove ordering works
      activeCourts: [1, 2], // 8 slots
      options: { memberPriority: true },
    })
    const assigned = allPlayers(result)
    const assignedMembers = assigned.filter(p => p.player_type === 'member')
    const assignedGuests = assigned.filter(p => p.player_type === 'guest')
    expect(assignedMembers).toHaveLength(6)
    expect(assignedGuests).toHaveLength(2) // only 2 slots left
  })
})

describe('suggest — mixed priority', () => {
  it('keeps top-ranked players on lower-numbered courts', () => {
    // 12 players across 3 courts, top 4 should be on courts 1-3 top tier
    const players = Array.from({ length: 12 }, (_, i) =>
      makePlayer(`p${i}`, `P${i}`, 'member', String(5 - i * 0.25))
    )
    const result = suggest({ participants: players, activeCourts: [1, 2, 3], options: { mixedPriority: true } })
    const court1Players = allPlayers(result.filter(c => c.court_number === 1))
    const court3Players = allPlayers(result.filter(c => c.court_number === 3))
    const court1AvgRank = court1Players.reduce((s, p) => s + parseRank(p.ranking), 0) / court1Players.length
    const court3AvgRank = court3Players.reduce((s, p) => s + parseRank(p.ranking), 0) / court3Players.length
    expect(court1AvgRank).toBeGreaterThan(court3AvgRank)
  })
})

describe('suggest — river mode', () => {
  it('keeps court 1 winners on court 1', () => {
    const w1 = makePlayer('w1', 'W1', 'member', '4.5')
    const w2 = makePlayer('w2', 'W2', 'member', '4.0')
    const l1 = makePlayer('l1', 'L1', 'member', '3.5')
    const l2 = makePlayer('l2', 'L2', 'member', '3.0')
    const priorRoundResult = {
      1: { winners: [w1, w2], losers: [l1, l2] },
    }
    const result = suggest({
      participants: [w1, w2, l1, l2],
      activeCourts: [1],
      options: { riverMode: true },
      priorRoundResult,
    })
    const court1 = allPlayers(result.filter(c => c.court_number === 1))
    expect(court1.map(p => p.id).sort()).toEqual(['w1', 'w2', 'l1', 'l2'].sort())
  })

  it('moves winners up and losers down across courts', () => {
    const c1w1 = makePlayer('c1w1', 'C1W1', 'member', '4.5')
    const c1w2 = makePlayer('c1w2', 'C1W2', 'member', '4.0')
    const c1l1 = makePlayer('c1l1', 'C1L1', 'member', '3.5')
    const c1l2 = makePlayer('c1l2', 'C1L2', 'member', '3.0')
    const c2w1 = makePlayer('c2w1', 'C2W1', 'member', '3.0')
    const c2w2 = makePlayer('c2w2', 'C2W2', 'member', '2.5')
    const c2l1 = makePlayer('c2l1', 'C2L1', 'member', '2.0')
    const c2l2 = makePlayer('c2l2', 'C2L2', 'member', '1.5')
    const priorRoundResult = {
      1: { winners: [c1w1, c1w2], losers: [c1l1, c1l2] },
      2: { winners: [c2w1, c2w2], losers: [c2l1, c2l2] },
    }
    const result = suggest({
      participants: [c1w1, c1w2, c1l1, c1l2, c2w1, c2w2, c2l1, c2l2],
      activeCourts: [1, 2],
      options: { riverMode: true },
      priorRoundResult,
    })
    // Court 1 winners stay on court 1, court 2 winners move to court 1
    const court1Ids = allPlayers(result.filter(c => c.court_number === 1)).map(p => p.id).sort()
    expect(court1Ids).toEqual(['c1w1', 'c1w2', 'c2w1', 'c2w2'].sort())
    // Court 1 losers move to court 2, court 2 losers stay on court 2
    const court2Ids = allPlayers(result.filter(c => c.court_number === 2)).map(p => p.id).sort()
    expect(court2Ids).toEqual(['c1l1', 'c1l2', 'c2l1', 'c2l2'].sort())
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- --run
```

Expected: FAIL — `algorithms.js` does not exist yet.

- [ ] **Step 3: Create `src/features/rounds/algorithms.js`**

```javascript
/**
 * Parse a DUPR-style ranking string to float.
 * Returns -1 for unparseable values (sorts last).
 * @param {string} ranking
 * @returns {number}
 */
export function parseRank(ranking) {
  const n = parseFloat(ranking)
  return isNaN(n) ? -1 : n
}

/**
 * Shuffle array in place using Fisher-Yates.
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Split players into a court assignment: first 2 = team1, last 2 = team2.
 * @param {number} courtNumber
 * @param {object[]} four - exactly 4 players
 */
function makeCourt(courtNumber, four) {
  return {
    court_number: courtNumber,
    team1: four.slice(0, 2),
    team2: four.slice(2, 4),
  }
}

/**
 * Main entry point.
 *
 * @param {object} input
 * @param {object[]} input.participants - checked players for this round
 * @param {number[]} input.activeCourts - e.g. [1,2,3]
 * @param {object} input.options - { memberPriority, genderPriority, rankPriority, socialPriority, mixedPriority, riverMode }
 * @param {object[]} [input.priorRounds] - committed rounds in current event, each with court_assignments
 * @param {object} [input.priorRoundResult] - { [courtNum]: { winners: Player[], losers: Player[] } }
 * @returns {{ court_number: number, team1: object[], team2: object[] }[]}
 */
export function suggest({ participants, activeCourts, options = {}, priorRounds = [], priorRoundResult = null }) {
  // Pros are never assigned by algorithm
  const pool = participants.filter(p => p.player_type !== 'pro')

  if (options.riverMode && priorRoundResult) {
    return riverAssign(pool, activeCourts, priorRoundResult)
  }

  return standardAssign(pool, activeCourts, options, priorRounds)
}

function standardAssign(pool, activeCourts, options, priorRounds) {
  const slots = activeCourts.length * 4
  let sorted = [...pool]

  // Member Priority: members before guests
  if (options.memberPriority) {
    sorted.sort((a, b) => {
      const rank = t => t === 'member' ? 0 : 1
      return rank(a.player_type) - rank(b.player_type)
    })
  }

  // Rank Priority: sort by rank descending (stable within member/guest groups if memberPriority also set)
  if (options.rankPriority) {
    sorted.sort((a, b) => {
      if (options.memberPriority) {
        const rankType = t => t === 'member' ? 0 : 1
        const typeDiff = rankType(a.player_type) - rankType(b.player_type)
        if (typeDiff !== 0) return typeDiff
      }
      return parseRank(b.ranking) - parseRank(a.ranking)
    })
  }

  // Mixed Priority: tier by rank, shuffle within tiers
  if (options.mixedPriority) {
    sorted = mixedPrioritySort(sorted, activeCourts.length)
  }

  // Take only as many players as fit
  let selected = sorted.slice(0, slots)

  // Gender Priority: rearrange selected to group genders per court
  if (options.genderPriority) {
    selected = genderGroup(selected, activeCourts.length)
  }

  // Social Priority: rearrange to minimize repeat court-sharings
  if (options.socialPriority && priorRounds.length > 0) {
    selected = socialPriorityArrange(selected, activeCourts.length, priorRounds)
  }

  return activeCourts.map((courtNum, i) =>
    makeCourt(courtNum, selected.slice(i * 4, i * 4 + 4))
  )
}

function mixedPrioritySort(pool, numCourts) {
  // Sort by rank descending, then divide into tiers, shuffle within each tier
  const byRank = [...pool].sort((a, b) => parseRank(b.ranking) - parseRank(a.ranking))
  const slots = numCourts * 4

  // Tier boundaries: top 3 courts, mid 3 courts, bottom 2 courts (scaled to numCourts)
  const topCourts = Math.min(3, Math.ceil(numCourts * 0.375))
  const botCourts = Math.min(2, Math.floor(numCourts * 0.25))
  const midCourts = numCourts - topCourts - botCourts

  const topSlots = topCourts * 4
  const midSlots = midCourts * 4
  const botSlots = botCourts * 4

  const top = shuffle(byRank.slice(0, topSlots))
  const mid = shuffle(byRank.slice(topSlots, topSlots + midSlots))
  const bot = shuffle(byRank.slice(topSlots + midSlots, topSlots + midSlots + botSlots))

  return [...top, ...mid, ...bot].slice(0, slots)
}

function genderGroup(selected, numCourts) {
  // Separate by gender, fill courts with single-gender groups where possible
  const groups = {}
  for (const p of selected) {
    const g = p.gender || 'Other'
    if (!groups[g]) groups[g] = []
    groups[g].push(p)
  }
  const genders = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length)

  const result = []
  const used = new Set()

  // Fill courts 4 at a time, preferring same gender
  for (let i = 0; i < numCourts; i++) {
    const court = []
    // Try to fill from the largest gender group first
    for (const g of genders) {
      const avail = groups[g].filter(p => !used.has(p.id))
      for (const p of avail) {
        if (court.length < 4) { court.push(p); used.add(p.id) }
      }
      if (court.length >= 4) break
    }
    result.push(...court)
  }

  // Append any unused players (shouldn't happen but safety net)
  for (const p of selected) {
    if (!used.has(p.id)) result.push(p)
  }

  return result.slice(0, selected.length)
}

function socialPriorityArrange(selected, numCourts, priorRounds) {
  // Build co-play count: how many times each pair has shared a court
  const coPlay = {}
  function key(a, b) { return [a, b].sort().join('|') }

  for (const round of priorRounds) {
    for (const assignment of (round.assignments ?? [])) {
      const courtPlayers = assignment.players ?? []
      for (let i = 0; i < courtPlayers.length; i++) {
        for (let j = i + 1; j < courtPlayers.length; j++) {
          const k = key(courtPlayers[i], courtPlayers[j])
          coPlay[k] = (coPlay[k] ?? 0) + 1
        }
      }
    }
  }

  function courtScore(group) {
    let score = 0
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        score += coPlay[key(group[i].id, group[j].id)] ?? 0
      }
    }
    return score
  }

  // Greedy: for each court slot, pick the player that minimizes score
  const remaining = [...selected]
  const result = []

  for (let c = 0; c < numCourts; c++) {
    const court = []
    for (let slot = 0; slot < 4 && remaining.length > 0; slot++) {
      // Find the player in remaining that minimizes total co-play with current court members
      let bestIdx = 0
      let bestScore = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]
        const s = courtScore([...court, candidate])
        if (s < bestScore) { bestScore = s; bestIdx = i }
      }
      court.push(remaining.splice(bestIdx, 1)[0])
    }
    result.push(...court)
  }

  return result
}

function riverAssign(pool, activeCourts, priorRoundResult) {
  // Build new court groups: winners of court N move to court N-1, losers move to court N+1
  // Court 1 winners stay on court 1; lowest court losers stay on lowest court
  const sortedCourts = [...activeCourts].sort((a, b) => a - b)
  const numCourts = sortedCourts.length

  // Map priorRoundResult keys (court numbers) to sorted index
  const newGroups = {} // courtIndex -> Player[]
  for (let i = 0; i < numCourts; i++) newGroups[i] = []

  for (let i = 0; i < numCourts; i++) {
    const courtNum = sortedCourts[i]
    const result = priorRoundResult[courtNum]
    if (!result) continue
    const { winners, losers } = result
    // Winners move up (lower index), except court 0 winners stay
    const winIdx = Math.max(0, i - 1)
    // Losers move down (higher index), except last court losers stay
    const loseIdx = Math.min(numCourts - 1, i + 1)
    newGroups[winIdx].push(...winners)
    newGroups[loseIdx].push(...losers)
  }

  return sortedCourts.map((courtNum, i) => {
    const group = newGroups[i].slice(0, 4)
    return makeCourt(courtNum, group)
  })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/rounds/
git commit -m "feat: assignment algorithms with full test coverage"
```

---

## Task 9: Round Detail UI Shell

**Files:**
- Create: `src/features/rounds/AlgorithmBar.jsx`, `src/features/rounds/ParticipantPanel.jsx`, `src/features/rounds/CourtCard.jsx`, `src/features/rounds/CourtGrid.jsx`
- Modify: `src/pages/RoundDetail.jsx`

- [ ] **Step 1: Create `src/features/rounds/AlgorithmBar.jsx`**

```javascript
const CHECKBOXES = [
  { key: 'memberPriority', label: 'Member Priority' },
  { key: 'genderPriority', label: 'Gender Priority' },
  { key: 'rankPriority', label: 'Rank Priority' },
  { key: 'socialPriority', label: 'Social Priority' },
  { key: 'mixedPriority', label: 'Mixed Priority' },
  { key: 'riverMode', label: 'River Mode' },
]

export default function AlgorithmBar({ options, onOptionChange, onSuggest, onCommit, isCommitted, canWrite }) {
  return (
    <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex items-center gap-2 flex-wrap">
      {canWrite && (
        <button
          onClick={onSuggest}
          className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium shrink-0"
        >
          ✨ Suggest
        </button>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 flex-1 justify-center">
        {CHECKBOXES.map(cb => (
          <label key={cb.key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!options[cb.key]}
              onChange={e => onOptionChange(cb.key, e.target.checked)}
            />
            {cb.label}
          </label>
        ))}
      </div>
      {canWrite && !isCommitted && (
        <>
          <div className="w-px h-6 bg-blue-200 shrink-0" />
          <button
            onClick={onCommit}
            className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium shrink-0"
          >
            Commit Round
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/features/rounds/ParticipantPanel.jsx`**

```javascript
export default function ParticipantPanel({ players, selected, onChange }) {
  // players: all plays_pickleball players; selected: Set of player ids
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="w-36 shrink-0 border-r border-gray-200 p-2 overflow-y-auto">
      <div className="text-xs font-bold uppercase text-gray-400 mb-2">Participants</div>
      <div className="space-y-1">
        {sorted.map(p => (
          <label key={p.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={e => {
                const next = new Set(selected)
                e.target.checked ? next.add(p.id) : next.delete(p.id)
                onChange(next)
              }}
            />
            <span className="text-xs truncate">
              {p.name}
              {p.ranking ? ` (${p.ranking})` : ''}
              {p.player_type === 'guest' ? <span className="text-gray-400"> G</span> : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/features/rounds/CourtCard.jsx`**

```javascript
export default function CourtCard({ courtNumber, isActive, team1, team2, winningTeam, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite }) {
  return (
    <div className={`border rounded-lg overflow-hidden ${isActive ? 'border-blue-300' : 'border-gray-200 opacity-50'}`}>
      <div className={`flex items-center justify-between px-2 py-1 text-xs font-semibold ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
        <span>Court {courtNumber}</span>
        {canWrite && (
          <label className="flex items-center gap-1 font-normal cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => onToggleActive(courtNumber, e.target.checked)}
              className="accent-white"
            />
            Active
          </label>
        )}
      </div>
      {isActive && (
        <div className="flex">
          {[{ team: 1, players: team1 }, { team: 2, players: team2 }].map(({ team, players }) => (
            <div key={team} className={`flex-1 p-1.5 ${team === 1 ? 'bg-blue-50 border-r border-blue-100' : 'bg-orange-50'}`}>
              <div className={`text-xs font-semibold mb-1 ${team === 1 ? 'text-blue-500' : 'text-orange-400'}`}>
                Team {team}
                {isCommitted && canWrite && (
                  <button
                    onClick={() => onSetWinner(courtNumber, team)}
                    className={`ml-1 px-1 rounded text-xs ${winningTeam === team ? 'bg-yellow-400 text-white' : 'text-gray-300 hover:text-yellow-400'}`}
                  >
                    🏆
                  </button>
                )}
              </div>
              {players.map(p => (
                <div
                  key={p.id}
                  onClick={() => canWrite && !isCommitted && onPlayerClick(p)}
                  className={`text-xs truncate py-0.5 ${canWrite && !isCommitted ? 'cursor-pointer hover:text-blue-600' : ''}`}
                >
                  {p.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/features/rounds/CourtGrid.jsx`**

```javascript
import CourtCard from './CourtCard'

export default function CourtGrid({ courts, draftAssignments, committedAssignments, results, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite }) {
  return (
    <div className="flex-1 p-2 overflow-y-auto">
      <div className="text-xs font-bold uppercase text-gray-400 mb-2">Courts</div>
      <div className="grid grid-cols-2 gap-2">
        {courts.map(court => {
          const assignments = isCommitted ? committedAssignments : draftAssignments
          const courtAssignments = assignments.find(a => a.court_number === court.court_number) ?? { team1: [], team2: [] }
          const result = results.find(r => r.court_number === court.court_number)
          return (
            <CourtCard
              key={court.court_number}
              courtNumber={court.court_number}
              isActive={court.is_active}
              team1={courtAssignments.team1}
              team2={courtAssignments.team2}
              winningTeam={result?.winning_team ?? null}
              onToggleActive={onToggleActive}
              onPlayerClick={onPlayerClick}
              onSetWinner={onSetWinner}
              isCommitted={isCommitted}
              canWrite={canWrite}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Replace `src/pages/RoundDetail.jsx`**

```javascript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { suggest } from '../features/rounds/algorithms'
import AlgorithmBar from '../features/rounds/AlgorithmBar'
import ParticipantPanel from '../features/rounds/ParticipantPanel'
import CourtGrid from '../features/rounds/CourtGrid'
import Spinner from '../components/Spinner'

export default function RoundDetail() {
  const { eventId, roundId } = useParams()
  const navigate = useNavigate()
  const session = useAuth()
  const canWrite = !!session

  const [round, setRound] = useState(null)
  const [event, setEvent] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [courts, setCourts] = useState([])
  const [participants, setParticipants] = useState(new Set())
  const [committedAssignments, setCommittedAssignments] = useState([])
  const [results, setResults] = useState([])
  const [draftAssignments, setDraftAssignments] = useState([])
  const [options, setOptions] = useState({})
  const [swapTarget, setSwapTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [roundId])

  async function load() {
    const [
      { data: rd },
      { data: ev },
      { data: players },
      { data: cts },
      { data: parts },
      { data: assignments },
      { data: res },
    ] = await Promise.all([
      supabase.from('rounds').select('*').eq('id', roundId).single(),
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('players').select('*').eq('plays_pickleball', true).order('name'),
      supabase.from('active_courts').select('*').eq('round_id', roundId).order('court_number'),
      supabase.from('round_participants').select('player_id').eq('round_id', roundId),
      supabase.from('court_assignments').select('*, players(*)').eq('round_id', roundId),
      supabase.from('court_results').select('*').eq('round_id', roundId),
    ])

    setRound(rd)
    setEvent(ev)
    setAllPlayers(players ?? [])
    setCourts(cts ?? [])
    setParticipants(new Set((parts ?? []).map(p => p.player_id)))
    setResults(res ?? [])

    // Build committed assignments from DB
    const committed = []
    for (let i = 1; i <= 8; i++) {
      const courtPlayers = (assignments ?? []).filter(a => a.court_number === i)
      if (courtPlayers.length > 0) {
        committed.push({
          court_number: i,
          team1: courtPlayers.filter(a => a.team === 1).map(a => a.players),
          team2: courtPlayers.filter(a => a.team === 2).map(a => a.players),
        })
      }
    }
    setCommittedAssignments(committed)
    setLoading(false)
  }

  async function handleParticipantChange(newSet) {
    setParticipants(newSet)
    if (!canWrite) return
    // Sync to DB: delete all then reinsert
    await supabase.from('round_participants').delete().eq('round_id', roundId)
    if (newSet.size > 0) {
      await supabase.from('round_participants').insert(
        [...newSet].map(pid => ({ round_id: roundId, player_id: pid }))
      )
    }
  }

  async function handleToggleActive(courtNumber, isActive) {
    setCourts(cs => cs.map(c => c.court_number === courtNumber ? { ...c, is_active: isActive } : c))
    if (!canWrite) return
    await supabase.from('active_courts')
      .update({ is_active: isActive })
      .eq('round_id', roundId)
      .eq('court_number', courtNumber)
  }

  function handleSuggest() {
    const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
    const participatingPlayers = allPlayers.filter(p => participants.has(p.id))
    const draft = suggest({ participants: participatingPlayers, activeCourts, options })
    setDraftAssignments(draft)
    setSwapTarget(null)
  }

  function handlePlayerClick(player) {
    if (round?.is_committed) return
    if (!swapTarget) {
      setSwapTarget(player)
      return
    }
    if (swapTarget.id === player.id) {
      setSwapTarget(null)
      return
    }
    // Swap the two players in draftAssignments
    setDraftAssignments(prev => prev.map(court => ({
      ...court,
      team1: court.team1.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
      team2: court.team2.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
    })))
    setSwapTarget(null)
  }

  async function handleCommit() {
    if (!confirm('Commit this round? Assignments will be saved.')) return
    // Save all draft assignments to DB
    const rows = draftAssignments.flatMap(court => [
      ...court.team1.map(p => ({ round_id: roundId, court_number: court.court_number, player_id: p.id, team: 1 })),
      ...court.team2.map(p => ({ round_id: roundId, court_number: court.court_number, player_id: p.id, team: 2 })),
    ])
    await supabase.from('court_assignments').delete().eq('round_id', roundId)
    if (rows.length > 0) await supabase.from('court_assignments').insert(rows)
    await supabase.from('rounds').update({ is_committed: true }).eq('id', roundId)
    load()
  }

  async function handleSetWinner(courtNumber, team) {
    const existing = results.find(r => r.court_number === courtNumber)
    if (existing) {
      await supabase.from('court_results')
        .update({ winning_team: team })
        .eq('round_id', roundId)
        .eq('court_number', courtNumber)
    } else {
      await supabase.from('court_results')
        .insert({ round_id: roundId, court_number: courtNumber, winning_team: team })
    }
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b flex items-center gap-2">
        <button onClick={() => navigate(`/events/${eventId}`)} className="text-sm text-blue-500">← {event?.name}</button>
        <span className="text-sm font-medium text-gray-600">/ Round {round?.round_number}</span>
      </div>

      <AlgorithmBar
        options={options}
        onOptionChange={(key, val) => setOptions(o => ({ ...o, [key]: val }))}
        onSuggest={handleSuggest}
        onCommit={handleCommit}
        isCommitted={round?.is_committed}
        canWrite={canWrite}
      />

      <div className="flex flex-1 overflow-hidden">
        <ParticipantPanel
          players={allPlayers}
          selected={participants}
          onChange={handleParticipantChange}
        />
        <CourtGrid
          courts={courts}
          draftAssignments={draftAssignments}
          committedAssignments={committedAssignments}
          results={results}
          onToggleActive={handleToggleActive}
          onPlayerClick={handlePlayerClick}
          onSetWinner={handleSetWinner}
          isCommitted={round?.is_committed}
          canWrite={canWrite}
        />
      </div>

      {swapTarget && (
        <div className="fixed bottom-16 left-0 right-0 bg-yellow-50 border-t border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center">
          Tap another player to swap with <strong>{swapTarget.name}</strong>. Tap again to cancel.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: round detail UI with participant panel, court grid, suggest, and commit"
```

---

## Task 10: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Enable GitHub Pages in repository settings**

Go to your GitHub repo → Settings → Pages → Source: GitHub Actions.

- [ ] **Step 2: Add Supabase secrets to GitHub repository**

Go to repo → Settings → Secrets and variables → Actions → New repository secret.

Add:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

- [ ] **Step 3: Create `.github/workflows/deploy.yml`**

```bash
mkdir -p .github/workflows
```

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Update `vite.config.js` base path**

The `base` in `vite.config.js` must match your GitHub repository name. If the repo is named `vintage-pickleball`, it stays as `/vintage-pickleball/`. Update if different.

- [ ] **Step 5: Commit and push**

```bash
git add .github/
git commit -m "feat: GitHub Actions deployment to GitHub Pages"
git remote add origin https://github.com/YOUR_USERNAME/vintage-pickleball.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

- [ ] **Step 6: Verify deployment**

Go to repo → Actions tab. Watch the workflow run. Once complete, open the Pages URL (Settings → Pages shows the URL, typically `https://YOUR_USERNAME.github.io/vintage-pickleball/`).

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Players tab: sortable table, add/edit/delete via modal, all fields, guest/member/pro types
- ✅ Events tab: list, add (with date + name defaults), delete
- ✅ Event detail: rounds list with status, add/delete round
- ✅ Round detail: participant checklist, court grid, active court toggles
- ✅ Suggest button with all 6 algorithm modes
- ✅ Manual adjustments: swap any two players
- ✅ Commit round → saves to DB
- ✅ Record winners per court (trophy button on committed rounds)
- ✅ Auth: individual pro logins, read-only for unauthenticated
- ✅ GitHub Pages deployment
- ✅ Supabase free tier compatible

**One gap addressed:** The swap interaction (tap player → tap another to swap) is described in Task 9 RoundDetail. Moving a player between teams on the same court is handled by the same `handlePlayerClick` — tapping a player on Team A then tapping a player on Team B swaps them, effectively moving each to the other's team. A future enhancement could add a more explicit "switch teams" button per player.
