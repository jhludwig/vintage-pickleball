# Court Animations & Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add staggered fade-in animations on court assignment suggestions, a gold flash when players are swapped, an amber ring on the swap-target player, and visual polish (name pills, gradient court header, amber holding pen chips) to the round detail page.

**Architecture:** Two CSS keyframes (`fade-in-up`, `flash-gold`) added to `tailwind.config.js`. State (`suggestKey`, `flashedIds`) added to `RoundDetail` and passed as props through `CourtGrid` to `CourtCard`. All visual changes are CSS-class-only — no new components, no new dependencies.

**Tech Stack:** React 19, Tailwind CSS v3 (custom keyframes), no new npm packages

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `tailwind.config.js` | Modify | Add `fade-in-up` and `flash-gold` keyframes + animation utilities |
| `src/pages/RoundDetail.jsx` | Modify | Add `suggestKey` + `flashedIds` state; update `handleSuggest` and `handlePlayerClick`; pass new props to `CourtGrid` |
| `src/features/rounds/CourtGrid.jsx` | Modify | Accept and forward `suggestKey`, `flashedIds`, `swapTargetId` to `CourtCard`; amber tint on holding pen chips |
| `src/features/rounds/CourtCard.jsx` | Modify | Apply animations to player divs; gradient header; player name pills |

Tasks must run in order: **1 → 2 → 3**. Task 3 (CourtCard) depends on the props wired up in Task 2.

---

## Task 1: Tailwind Keyframes

**Files:**
- Modify: `tailwind.config.js`

No tests for config changes — verify by running `npm run build` (Tailwind must be able to resolve the new animation utilities).

- [ ] **Step 1: Update `tailwind.config.js`**

Replace the entire file with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'flash-gold': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '40%':      { backgroundColor: 'rgb(251 191 36 / 0.35)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.25s ease-out both',
        'flash-gold': 'flash-gold 0.6s ease-in-out',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: build completes with no errors. The new `animate-fade-in-up` and `animate-flash-gold` utilities are now available as Tailwind classes.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add fade-in-up and flash-gold animation keyframes"
```

---

## Task 2: Prop Plumbing — RoundDetail + CourtGrid

**Files:**
- Modify: `src/pages/RoundDetail.jsx`
- Modify: `src/features/rounds/CourtGrid.jsx`

These changes add two new state values to `RoundDetail` and pass them (plus `swapTargetId`) through `CourtGrid` to `CourtCard`. `CourtGrid` is a thin passthrough — it just forwards the new props.

**How the new state works:**
- `suggestKey` — integer, starts at 0, incremented each time Suggest is clicked. Passed to `CourtCard` where it's appended to each player's `key` prop to force a re-mount, which triggers `animate-fade-in-up` fresh.
- `flashedIds` — a `Set<string>` of the two player IDs involved in the most recent swap. Each player div gets `animate-flash-gold` if its ID is in the set. Cleared after 700ms via `setTimeout`.
- `swapTargetId` — derived from existing `swapTarget` state as `swapTarget?.id ?? null`. Passed down so `CourtCard` can apply an amber ring to the selected player.

- [ ] **Step 1: Add state and update handlers in `src/pages/RoundDetail.jsx`**

Find this block of state declarations (around line 18–30):
```jsx
  const [swapTarget, setSwapTarget] = useState(null)
  const [loading, setLoading] = useState(true)
```

Replace with:
```jsx
  const [swapTarget, setSwapTarget] = useState(null)
  const [suggestKey, setSuggestKey] = useState(0)
  const [flashedIds, setFlashedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
```

Find the current `handleSuggest` function:
```jsx
  function handleSuggest() {
    const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
    const participatingPlayers = allPlayers.filter(p => participants.has(p.id))
    const draft = suggest({ participants: participatingPlayers, activeCourts, options, priorRounds, priorRoundResult })
    setDraftAssignments(draft)
    setSwapTarget(null)
  }
```

Replace with:
```jsx
  function handleSuggest() {
    const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
    const participatingPlayers = allPlayers.filter(p => participants.has(p.id))
    const draft = suggest({ participants: participatingPlayers, activeCourts, options, priorRounds, priorRoundResult })
    setDraftAssignments(draft)
    setSwapTarget(null)
    setSuggestKey(k => k + 1)
  }
```

Find the swap completion block inside `handlePlayerClick` (the final else branch that calls `setDraftAssignments` and `setSwapTarget(null)`):
```jsx
    // Swap the two players in draftAssignments
    setDraftAssignments(prev => prev.map(court => ({
      ...court,
      team1: court.team1.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
      team2: court.team2.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
    })))
    setSwapTarget(null)
```

Replace with:
```jsx
    // Swap the two players in draftAssignments
    setDraftAssignments(prev => prev.map(court => ({
      ...court,
      team1: court.team1.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
      team2: court.team2.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
    })))
    setFlashedIds(new Set([swapTarget.id, player.id]))
    setTimeout(() => setFlashedIds(new Set()), 700)
    setSwapTarget(null)
```

Find the `<CourtGrid>` JSX block:
```jsx
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
          holdingPen={holdingPen}
        />
```

Replace with:
```jsx
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
          holdingPen={holdingPen}
          suggestKey={suggestKey}
          flashedIds={flashedIds}
          swapTargetId={swapTarget?.id ?? null}
        />
```

- [ ] **Step 2: Update `src/features/rounds/CourtGrid.jsx`**

Replace the entire file with:

```jsx
import CourtCard from './CourtCard'
import { fullName } from '../../lib/playerName'

export default function CourtGrid({ courts, draftAssignments, committedAssignments, results, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite, holdingPen, suggestKey, flashedIds, swapTargetId }) {
  return (
    <div className="flex-1 p-2 overflow-y-auto">
      <div className="text-xs font-bold uppercase text-stone-400 mb-2">Courts</div>
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
              suggestKey={suggestKey}
              flashedIds={flashedIds}
              swapTargetId={swapTargetId}
            />
          )
        })}
      </div>

      {holdingPen.length > 0 && (
        <div className="mt-3 border border-amber-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Holding Pen
          </div>
          <div className="bg-white px-3 py-2 flex flex-wrap gap-2">
            {holdingPen.map(p => (
              <div
                key={p.id}
                onClick={() => !isCommitted && canWrite && onPlayerClick(p)}
                className={`text-xs px-2 py-1 rounded-lg border border-amber-200 bg-amber-50/60 ${!isCommitted && canWrite ? 'cursor-pointer hover:bg-amber-100 hover:border-amber-300 hover:text-amber-800' : 'text-stone-600'}`}
              >
                {fullName(p)}
                {p.ranking ? <span className="text-stone-400 ml-1">{p.ranking}</span> : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run build to verify no errors**

```bash
npm run build
```

Expected: build succeeds, no type errors or import errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RoundDetail.jsx src/features/rounds/CourtGrid.jsx
git commit -m "feat: add suggestKey and flashedIds state; wire new props to CourtGrid"
```

---

## Task 3: CourtCard Visual Overhaul

**Files:**
- Modify: `src/features/rounds/CourtCard.jsx`

This task applies all the visual changes: animated player name pills, gradient court header, swap-target ring, flash animation.

**How the player div key works:** Each player div uses `key={p.id + '-' + suggestKey}`. When `suggestKey` increments (on Suggest click), all player divs re-mount and `animate-fade-in-up` fires again with staggered delays. When players are in `flashedIds`, they get `animate-flash-gold` instead (the two animations are mutually exclusive — flash happens after a swap, fade-in happens after a suggest; they don't overlap in practice).

**Stagger index:** Players are indexed 0–3 across both teams using `teamIdx * 2 + playerIdx`:
- team1[0] → index 0 → delay 0ms
- team1[1] → index 1 → delay 80ms
- team2[0] → index 2 → delay 160ms
- team2[1] → index 3 → delay 240ms

- [ ] **Step 1: Replace `src/features/rounds/CourtCard.jsx`**

```jsx
import { fullName } from '../../lib/playerName'

export default function CourtCard({ courtNumber, isActive, team1, team2, winningTeam, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite, suggestKey, flashedIds, swapTargetId }) {
  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${isActive ? 'border-emerald-300 shadow-sm' : 'border-stone-200 opacity-50'}`}>
      <div className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold ${isActive ? 'bg-gradient-to-r from-emerald-700 to-emerald-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
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
        <div className="flex flex-col">
          {[{ team: 1, players: team1 }, { team: 2, players: team2 }].map(({ team, players }, teamIdx) => (
            <div key={team} className={`p-2 ${team === 1 ? 'bg-blue-50 border-b border-blue-100' : 'bg-orange-50'}`}>
              <div className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${team === 1 ? 'text-blue-500' : 'text-orange-400'}`}>
                Team {team}
                {isCommitted && canWrite && (
                  <button
                    onClick={() => onSetWinner(courtNumber, team)}
                    className={`ml-0.5 px-1 rounded text-xs transition-colors ${winningTeam === team ? 'bg-amber-400 text-white' : 'text-stone-300 hover:text-amber-400'}`}
                  >
                    🏆
                  </button>
                )}
              </div>
              {players.map((p, playerIdx) => {
                const index = teamIdx * 2 + playerIdx
                const isFlashing = flashedIds?.has(p.id)
                const isSwapTarget = swapTargetId === p.id
                return (
                  <div
                    key={p.id + '-' + suggestKey}
                    style={{ animationDelay: `${index * 80}ms` }}
                    onClick={() => canWrite && !isCommitted && onPlayerClick(p)}
                    className={[
                      'text-xs truncate py-0.5 px-2 rounded-md border mb-0.5',
                      isFlashing ? 'animate-flash-gold' : 'animate-fade-in-up',
                      team === 1 ? 'bg-white/70 border-blue-100' : 'bg-white/70 border-orange-100',
                      isSwapTarget ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                      canWrite && !isCommitted ? 'cursor-pointer hover:bg-white hover:text-emerald-700' : 'text-stone-700',
                    ].filter(Boolean).join(' ')}
                  >
                    {fullName(p)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests and build**

```bash
npm test -- --run && npm run build
```

Expected: all 30 tests pass, build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/rounds/CourtCard.jsx
git commit -m "feat: animate court assignments, swap flash, name pills, gradient header"
```

---

## Task 4: Push

- [ ] **Step 1: Push to remote**

```bash
git push
```
