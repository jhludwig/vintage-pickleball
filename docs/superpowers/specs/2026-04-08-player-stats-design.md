# Per-Player Stats Page — Design Spec

## Goal

Add a publicly visible stats page for each player showing their current-season performance: events attended, games played, wins, and win rate.

## Architecture

**New files:**
- `src/lib/season.js` — pure utility, exports `currentSeasonRange()`
- `src/pages/PlayerDetail.jsx` — stats page at `/players/:playerId`
- `src/lib/season.test.js` — unit tests for season range logic

**Modified files:**
- `src/App.jsx` — add route `players/:playerId`
- `src/pages/Players.jsx` — row click always navigates to `/players/:playerId` (currently a no-op for non-auth users)

---

## Season Range Logic

`src/lib/season.js` exports `currentSeasonRange(today?: Date)` returning:
```js
{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', label: '2025–2026 Season' }
```

Rules (using today's local month, 1–12):
- Month 11–12 (Nov–Dec): season = `{year}-11-01` → `{year+1}-05-31`, label = `{year}–{year+1} Season`
- Month 1–10 (Jan–Oct): season = `{year-1}-11-01` → `{year}-05-31`, label = `{year-1}–{year} Season`

This covers both in-season (Nov–May) and off-season (Jun–Oct) — off-season shows the most recently completed season.

---

## Data Queries

Three parallel Supabase queries on page load:

1. **Player record** — `players` by id
2. **Events attended** — `round_participants` for this player joined to `rounds` joined to `events` where `events.date BETWEEN season.start AND season.end`. Count distinct `event_id` values.
3. **Games played + wins** — `court_assignments` for this player joined through `rounds → events` with the same season date filter. Cross-reference with `court_results` to determine wins. A game played = any court assignment in season. A win = assignment where `team === winning_team`.

Derived stats:
- **Events attended** — distinct event count from query 2
- **Games played** — row count from query 3
- **Wins** — subset of query 3 rows where team matched winning team
- **Win rate** — wins / games played as percentage; displayed as `"—"` if games played = 0

---

## Routing

New route in `App.jsx`:
```jsx
<Route path="players/:playerId" element={<PlayerDetail />} />
```

`Players.jsx` row click changes from:
```jsx
onRowClick={p => session && setModal(p)}
```
to:
```jsx
onRowClick={p => navigate(`/players/${p.id}`)}
```
for all users. Auth users can still edit via the Edit button on the PlayerDetail page.

---

## UI — PlayerDetail page

Layout follows existing conventions (max-w-lg, emerald/stone palette, same card style as EventDetail stats).

```
← Players

Jane Smith                    [Edit]   ← auth only
Member · 3.5

2025–2026 Season

┌──────────┬──────────┬──────────┬──────────┐
│    12    │    18    │    11    │   61%    │
│  Events  │  Games   │   Wins   │ Win Rate │
└──────────┴──────────┴──────────┴──────────┘
```

- `← Players` back link at top
- Player name (large, bold), player type + ranking below
- Edit button top-right, auth-only, opens existing `PlayerModal`
- Season label (`2025–2026 Season`) above the stat card
- 4-column stat card: Events · Games · Wins · Win Rate
- Win rate shown as `"61%"` or `"—"` if no games played
- If player not found, show "Player not found" message

---

## Out of Scope

- All-time or multi-season stats
- Per-event breakdown on the stats page
- Head-to-head records
- Stats visible on the Players list table itself
