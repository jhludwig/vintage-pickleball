# Per-Player Stats Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a publicly visible stats page at `/players/:playerId` showing each player's current-season events attended, games played, wins, and win rate.

**Architecture:** A new `currentSeasonRange()` utility in `src/lib/season.js` computes the Nov–May season date range for filtering. A new `PlayerDetail` page loads the player record and computes season stats from three Supabase queries. The Players list row click is updated to navigate to the stats page for all users (auth users can still edit via an Edit button on the stats page).

**Tech Stack:** React 19, React Router v6, Supabase JS client, Tailwind CSS v3, Vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/season.js` | Create | `currentSeasonRange()` utility — returns `{ start, end, label }` |
| `src/lib/season.test.js` | Create | Unit tests for season range logic |
| `src/pages/PlayerDetail.jsx` | Create | Stats page at `/players/:playerId` |
| `src/App.jsx` | Modify | Add `players/:playerId` route |
| `src/pages/Players.jsx` | Modify | Row click navigates to player stats page for all users |

---

## Task 1: Season Range Utility

**Files:**
- Create: `src/lib/season.js`
- Create: `src/lib/season.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/season.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { currentSeasonRange } from './season'

describe('currentSeasonRange', () => {
  it('returns correct range for a date in November', () => {
    const result = currentSeasonRange(new Date('2025-11-15'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns correct range for a date in December', () => {
    const result = currentSeasonRange(new Date('2025-12-01'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns correct range for a date in January', () => {
    const result = currentSeasonRange(new Date('2026-01-20'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns correct range for a date in May', () => {
    const result = currentSeasonRange(new Date('2026-05-31'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns most recent season for an off-season date in June', () => {
    const result = currentSeasonRange(new Date('2026-06-01'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns most recent season for an off-season date in October', () => {
    const result = currentSeasonRange(new Date('2026-10-31'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run
```

Expected: 6 new failures — "currentSeasonRange is not a function" or similar.

- [ ] **Step 3: Implement `src/lib/season.js`**

```js
/**
 * Returns the current season's date range and display label.
 * Season runs Nov 1 – May 31 (wraps across Jan 1).
 * In-season (Nov–May): returns the active season.
 * Off-season (Jun–Oct): returns the most recently completed season.
 *
 * @param {Date} [today] - defaults to now
 * @returns {{ start: string, end: string, label: string }}
 */
export function currentSeasonRange(today = new Date()) {
  const year = today.getFullYear()
  const month = today.getMonth() + 1 // 1–12

  if (month >= 11) {
    return {
      start: `${year}-11-01`,
      end: `${year + 1}-05-31`,
      label: `${year}–${year + 1} Season`,
    }
  }
  return {
    start: `${year - 1}-11-01`,
    end: `${year}-05-31`,
    label: `${year - 1}–${year} Season`,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run
```

Expected: all tests pass (previously passing tests plus the 6 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/season.js src/lib/season.test.js
git commit -m "feat: add currentSeasonRange utility"
```

---

## Task 2: PlayerDetail Page

**Files:**
- Create: `src/pages/PlayerDetail.jsx`

This page loads a player and computes their current-season stats from three parallel Supabase queries. Supabase's nested select syntax (`rounds(event_id, events(date))`) traverses the FK chain `round_participants → rounds → events` in a single request.

**How stats are computed:**
- **Events attended** — distinct `event_id` values from `round_participants` rows filtered to the current season
- **Games played** — count of `court_assignments` rows filtered to the current season (being assigned to a court = playing a game)
- **Wins** — court_assignments in season where `team === winning_team` in `court_results`
- **Win rate** — `Math.round((wins / gamesPlayed) * 100) + '%'`; `'—'` if 0 games played

- [ ] **Step 1: Create `src/pages/PlayerDetail.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fullName } from '../lib/playerName'
import { currentSeasonRange } from '../lib/season'
import PlayerModal from '../features/players/PlayerModal'
import Spinner from '../components/Spinner'

export default function PlayerDetail() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const session = useAuth()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const season = currentSeasonRange()

  const load = useCallback(async () => {
    const [
      { data: playerData },
      { data: participations },
      { data: assignments },
    ] = await Promise.all([
      supabase.from('players').select('*').eq('id', playerId).single(),
      supabase
        .from('round_participants')
        .select('round_id, rounds(event_id, events(date))')
        .eq('player_id', playerId),
      supabase
        .from('court_assignments')
        .select('round_id, court_number, team, rounds(event_id, events(date))')
        .eq('player_id', playerId),
    ])

    const inSeason = date => date >= season.start && date <= season.end

    const seasonParticipations = (participations ?? []).filter(
      p => p.rounds?.events?.date && inSeason(p.rounds.events.date)
    )
    const seasonAssignments = (assignments ?? []).filter(
      a => a.rounds?.events?.date && inSeason(a.rounds.events.date)
    )

    const eventsAttended = new Set(seasonParticipations.map(p => p.rounds.event_id)).size
    const gamesPlayed = seasonAssignments.length

    let wins = 0
    if (seasonAssignments.length > 0) {
      const roundIds = [...new Set(seasonAssignments.map(a => a.round_id))]
      const { data: results } = await supabase
        .from('court_results')
        .select('round_id, court_number, winning_team')
        .in('round_id', roundIds)

      const resultMap = {}
      for (const r of (results ?? [])) {
        resultMap[`${r.round_id}:${r.court_number}`] = r.winning_team
      }

      wins = seasonAssignments.filter(a =>
        resultMap[`${a.round_id}:${a.court_number}`] === a.team
      ).length
    }

    const winRate = gamesPlayed > 0 ? `${Math.round((wins / gamesPlayed) * 100)}%` : '—'

    setPlayer(playerData)
    setStats({ eventsAttended, gamesPlayed, wins, winRate })
    setLoading(false)
  }, [playerId, season.start, season.end])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    const { id, created_at, ...fields } = form
    const { error } = await supabase.from('players').update(fields).eq('id', id)
    if (error) { alert(`Failed to save: ${error.message}`); return }
    setShowEdit(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) { alert(`Failed to delete: ${error.message}`); return }
    navigate('/players')
  }

  if (loading) return <Spinner />
  if (!player) return <div className="p-4 text-stone-500">Player not found</div>

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={() => navigate('/players')}
          className="text-sm text-emerald-600 hover:text-emerald-700 mb-2 inline-flex items-center gap-1"
        >
          ← Players
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-800">{fullName(player)}</h2>
            <p className="text-sm text-stone-400 mt-0.5 capitalize">
              {player.player_type}{player.ranking ? ` · ${player.ranking}` : ''}
            </p>
          </div>
          {session && (
            <button
              onClick={() => setShowEdit(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">
          {season.label}
        </div>
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.eventsAttended}</div>
            <div className="text-xs text-stone-400 mt-0.5">Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.gamesPlayed}</div>
            <div className="text-xs text-stone-400 mt-0.5">Games</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.wins}</div>
            <div className="text-xs text-stone-400 mt-0.5">Wins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.winRate}</div>
            <div className="text-xs text-stone-400 mt-0.5">Win Rate</div>
          </div>
        </div>
      </div>

      {showEdit && (
        <PlayerModal
          player={player}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests and build to verify no errors**

```bash
npm test -- --run && npm run build
```

Expected: all tests pass, build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PlayerDetail.jsx
git commit -m "feat: add PlayerDetail stats page"
```

---

## Task 3: Wire Up Routing

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/Players.jsx`

- [ ] **Step 1: Add the route in `src/App.jsx`**

Current `src/App.jsx`:
```jsx
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
```

Replace with:
```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
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
        <Route path="players/:playerId" element={<PlayerDetail />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:eventId" element={<EventDetail />} />
        <Route path="events/:eventId/rounds/:roundId" element={<RoundDetail />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 2: Update row click in `src/pages/Players.jsx`**

In `src/pages/Players.jsx`, add `useNavigate` to the React Router import and add `navigate` to the component body. Then update the `PlayerTable` prop.

Find this import line:
```jsx
import { useCallback, useEffect, useState } from 'react'
```

Replace with:
```jsx
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
```

Find this line at the top of the `Players()` function body (after the `const session = useAuth()` line):
```jsx
  const session = useAuth()
  const [players, setPlayers] = useState([])
```

Replace with:
```jsx
  const session = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
```

Find this line:
```jsx
      <PlayerTable players={players} onRowClick={p => session && setModal(p)} />
```

Replace with:
```jsx
      <PlayerTable players={players} onRowClick={p => navigate(`/players/${p.id}`)} />
```

- [ ] **Step 3: Run tests and build**

```bash
npm test -- --run && npm run build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/pages/Players.jsx
git commit -m "feat: wire up player stats page routing"
```

---

## Task 4: Push

- [ ] **Step 1: Push to remote**

```bash
git push
```
