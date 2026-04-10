# Pro Auto-Assign to Underfull Courts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a pro in the holding pen be added to a court with ≤3 players by clicking their name once.

**Architecture:** A new early branch in `handlePlayerClick` (in `RoundDetail.jsx`) detects when the clicked player is a pro, finds the first underfull court in `draftAssignments`, and appends the pro to the team with fewer players. If no underfull court exists, the click is a no-op. No new state, no new components.

**Tech Stack:** React 19. No new dependencies.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/pages/RoundDetail.jsx` | Modify | Add pro auto-assign branch to `handlePlayerClick` |

---

## Task 1: Pro Auto-Assign in `handlePlayerClick`

**Files:**
- Modify: `src/pages/RoundDetail.jsx`

The codebase has no React component test setup — there are only pure-function unit tests (Vitest). Verification is via `npm run build`.

The current `handlePlayerClick` (lines 164–183):

```jsx
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
  setFlashedIds(new Set([swapTarget.id, player.id]))
  setTimeout(() => setFlashedIds(new Set()), 700)
  setSwapTarget(null)
}
```

- [ ] **Step 1: Update `handlePlayerClick` in `src/pages/RoundDetail.jsx`**

Find the exact block above and replace with:

```jsx
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
  setFlashedIds(new Set([swapTarget.id, player.id]))
  setTimeout(() => setFlashedIds(new Set()), 700)
  setSwapTarget(null)
}
```

- [ ] **Step 2: Run tests and build**

```bash
npm test -- --run && npm run build
```

Expected: all 42 tests pass, build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RoundDetail.jsx
git commit -m "feat: auto-assign pro from holding pen to underfull court on click"
```

---

## Task 2: Push

- [ ] **Step 1: Push to remote**

```bash
git push
```
