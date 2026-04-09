# Court Animations & Visual Polish — Design Spec

## Goal

Make the round detail page feel more alive: animate court assignments when Suggest is clicked, flash swapped players, highlight the swap target directly in the court card, and polish player name pills, court headers, and holding pen chips.

## Scope

All changes are on the round detail page only (`RoundDetail.jsx`, `CourtGrid.jsx`, `CourtCard.jsx`). No new dependencies — animations use CSS keyframes added to `tailwind.config.js`.

---

## Files

| File | Action | Purpose |
|---|---|---|
| `tailwind.config.js` | Modify | Add `fade-in-up` and `flash-gold` keyframes + animation utilities |
| `src/pages/RoundDetail.jsx` | Modify | Track `suggestKey` (incremented on Suggest) and `flashedIds` (cleared after 700ms); pass new props |
| `src/features/rounds/CourtGrid.jsx` | Modify | Pass `suggestKey`, `flashedIds`, `swapTargetId` through to CourtCard |
| `src/features/rounds/CourtCard.jsx` | Modify | Apply animations; player pill styling; gradient header; holding pen tint |

---

## Animations

### Keyframes (tailwind.config.js)

```js
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
```

### Suggest: staggered fade-in-up

`RoundDetail` gains:
```js
const [suggestKey, setSuggestKey] = useState(0)
```

`handleSuggest` increments it after calling `setDraftAssignments`:
```js
function handleSuggest() {
  const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
  const participatingPlayers = allPlayers.filter(p => participants.has(p.id))
  const draft = suggest({ participants: participatingPlayers, activeCourts, options, priorRounds, priorRoundResult })
  setDraftAssignments(draft)
  setSwapTarget(null)
  setSuggestKey(k => k + 1)
}
```

`suggestKey` is passed down: `RoundDetail → CourtGrid → CourtCard`.

In `CourtCard`, each player div uses `key={p.id + '-' + suggestKey}` and receives `animate-fade-in-up` with a staggered `animationDelay`:

- Player index is computed across both teams: team1[0]=0, team1[1]=1, team2[0]=2, team2[1]=3
- `style={{ animationDelay: `${index * 80}ms` }}`

This forces a re-mount on each new suggestion, triggering the animation fresh.

### Swap flash: flash-gold on swapped players

`RoundDetail` gains:
```js
const [flashedIds, setFlashedIds] = useState(new Set())
```

After a swap completes in `handlePlayerClick`, record the two IDs and clear after 700ms:
```js
setFlashedIds(new Set([swapTarget.id, player.id]))
setTimeout(() => setFlashedIds(new Set()), 700)
```

`flashedIds` is passed down: `RoundDetail → CourtGrid → CourtCard`.

Each player div gets `animate-flash-gold` if `flashedIds.has(p.id)`.

### Swap target: amber ring in court card

`swapTarget?.id` (renamed `swapTargetId` for prop clarity) is passed down: `RoundDetail → CourtGrid → CourtCard`.

The selected player div gets `ring-2 ring-amber-400 ring-offset-1 rounded-md` in addition to its normal classes.

---

## Visual Polish

### Player name pills (CourtCard)

**Before:**
```jsx
<div className={`text-xs truncate py-0.5 rounded px-0.5 ${canWrite && !isCommitted ? 'cursor-pointer hover:bg-white/60 hover:text-emerald-700' : 'text-stone-700'}`}>
```

**After** (team-aware background, clearer chip shape):
```jsx
<div
  key={p.id + '-' + suggestKey}
  style={{ animationDelay: `${index * 80}ms` }}
  onClick={() => canWrite && !isCommitted && onPlayerClick(p)}
  className={[
    'text-xs truncate py-0.5 px-2 rounded-md border animate-fade-in-up',
    team === 1 ? 'bg-white/70 border-blue-100' : 'bg-white/70 border-orange-100',
    flashedIds.has(p.id) ? 'animate-flash-gold' : '',
    swapTargetId === p.id ? 'ring-2 ring-amber-400 ring-offset-1' : '',
    canWrite && !isCommitted ? 'cursor-pointer hover:bg-white hover:text-emerald-700' : 'text-stone-700',
  ].filter(Boolean).join(' ')}
>
  {fullName(p)}
</div>
```

Note: Tailwind only supports one `animation` property at a time, so `animate-fade-in-up` and `animate-flash-gold` cannot both be on the same element simultaneously. In practice they don't conflict: `fade-in-up` runs for 250ms on mount (from a suggest), and `flash-gold` runs for 600ms after a swap — these events don't overlap. Apply them as mutually exclusive: use `animate-flash-gold` when `flashedIds.has(p.id)`, otherwise use `animate-fade-in-up`.

### Court header gradient (CourtCard)

**Before:** `bg-emerald-600 text-white`

**After:** `bg-gradient-to-r from-emerald-700 to-emerald-500 text-white`

Inactive court header stays `bg-stone-100 text-stone-400` (unchanged).

### Holding pen chip tint (CourtGrid)

**Before:**
```jsx
className={`text-xs px-2 py-1 rounded-lg border border-stone-200 bg-stone-50 ${...}`}
```

**After:**
```jsx
className={`text-xs px-2 py-1 rounded-lg border border-amber-200 bg-amber-50/60 ${...}`}
```

The hover state for clickable chips stays `hover:bg-amber-100 hover:border-amber-300 hover:text-amber-800` (same intent, slightly warmer base).

---

## Out of Scope

- Animations on any page other than the round detail page
- Drag-and-drop for swapping
- Exit animations when courts are cleared
- Any new npm dependencies
