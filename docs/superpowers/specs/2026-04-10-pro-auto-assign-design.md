# Pro Auto-Assign to Underfull Courts — Design Spec

## Goal

Allow a pro in the holding pen to be added to a court with ≤3 players by clicking their name once.

## Scope

One change: `handlePlayerClick` in `src/pages/RoundDetail.jsx` gains a new early branch for pro players. No new components, no new state, no new dependencies.

---

## Behavior

When a player with `player_type === 'pro'` is clicked in the holding pen:

1. Find the first court in `draftAssignments` (lowest `court_number`) where `team1.length + team2.length < 4`
2. If found: add the pro to whichever team on that court has fewer players (`team1` if tied or equal)
3. If no underfull court exists: do nothing

The pro disappears from the holding pen and appears on the target court immediately. No flash animation, no swap state changes.

Pros cannot be set as `swapTarget` — the swap mechanism is for players already on courts. Clicking a pro always triggers the auto-add path (or does nothing), never the swap path.

---

## Logic

```js
function handlePlayerClick(player) {
  if (round?.is_committed) return

  if (player.player_type === 'pro') {
    const target = draftAssignments.find(c => c.team1.length + c.team2.length < 4)
    if (!target) return
    setDraftAssignments(prev => prev.map(c => {
      if (c.court_number !== target.court_number) return c
      if (c.team1.length <= c.team2.length) {
        return { ...c, team1: [...c.team1, player] }
      }
      return { ...c, team2: [...c.team2, player] }
    }))
    return
  }

  // existing swap logic unchanged below...
}
```

---

## Files

| File | Action | Purpose |
|---|---|---|
| `src/pages/RoundDetail.jsx` | Modify | Add pro auto-assign branch to `handlePlayerClick` |

---

## Edge Cases

- **Multiple underfull courts** — pro goes to lowest `court_number`. User can swap from there.
- **No underfull courts** — click does nothing; pro stays in holding pen.
- **Round committed** — early return at top of function; no change (existing behavior).
- **Pro already on a court** — not possible; algorithm never assigns pros, and the only way to place a pro is via this new path.

---

## Out of Scope

- Removing a pro from a court back to the holding pen
- Choosing which underfull court to assign to
- Animation on the pro being added
