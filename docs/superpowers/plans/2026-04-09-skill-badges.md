# DUPR Skill Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a colored left-border stripe to player name pills on court cards and participant list rows to show DUPR skill tier at a glance.

**Architecture:** A single `ratingTierClass(ranking)` utility added to `src/lib/playerName.js` returns a Tailwind `border-l-{color}` class for the player's tier. `CourtCard` and `ParticipantPanel` each add `border-l-4` plus the tier class to their player elements — no new components, no new dependencies.

**Tech Stack:** React 19, Tailwind CSS v3, Vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/playerName.js` | Modify | Add `ratingTierClass(ranking)` utility |
| `src/lib/playerName.test.js` | Create | Unit tests for `ratingTierClass` |
| `src/features/rounds/CourtCard.jsx` | Modify | Add `border-l-4` + tier class to player pills |
| `src/features/rounds/ParticipantPanel.jsx` | Modify | Add `border-l-4` + tier class to label rows |

---

## Task 1: `ratingTierClass` Utility

**Files:**
- Modify: `src/lib/playerName.js`
- Create: `src/lib/playerName.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/playerName.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { ratingTierClass } from './playerName'

describe('ratingTierClass', () => {
  it('returns purple for 5.5', () => {
    expect(ratingTierClass('5.5')).toBe('border-l-purple-500')
  })
  it('returns purple for 6.0', () => {
    expect(ratingTierClass('6.0')).toBe('border-l-purple-500')
  })
  it('returns blue for 4.5', () => {
    expect(ratingTierClass('4.5')).toBe('border-l-blue-500')
  })
  it('returns blue for 5.49', () => {
    expect(ratingTierClass('5.49')).toBe('border-l-blue-500')
  })
  it('returns emerald for 3.5', () => {
    expect(ratingTierClass('3.5')).toBe('border-l-emerald-500')
  })
  it('returns emerald for 4.49', () => {
    expect(ratingTierClass('4.49')).toBe('border-l-emerald-500')
  })
  it('returns amber for 2.5', () => {
    expect(ratingTierClass('2.5')).toBe('border-l-amber-400')
  })
  it('returns amber for 3.49', () => {
    expect(ratingTierClass('3.49')).toBe('border-l-amber-400')
  })
  it('returns stone for 2.4', () => {
    expect(ratingTierClass('2.4')).toBe('border-l-stone-300')
  })
  it('returns stone for empty string', () => {
    expect(ratingTierClass('')).toBe('border-l-stone-300')
  })
  it('returns stone for non-numeric', () => {
    expect(ratingTierClass('N/A')).toBe('border-l-stone-300')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run
```

Expected: 11 new failures — "ratingTierClass is not a function" or similar.

- [ ] **Step 3: Add `ratingTierClass` to `src/lib/playerName.js`**

Replace the entire file with:

```js
export function fullName(player) {
  return `${player.first_name} ${player.last_name}`.trim()
}

export function ratingTierClass(ranking) {
  const r = parseFloat(ranking)
  if (isNaN(r) || r < 2.5) return 'border-l-stone-300'
  if (r >= 5.5) return 'border-l-purple-500'
  if (r >= 4.5) return 'border-l-blue-500'
  if (r >= 3.5) return 'border-l-emerald-500'
  return 'border-l-amber-400'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run
```

Expected: all tests pass (previously passing tests plus the 11 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/playerName.js src/lib/playerName.test.js
git commit -m "feat: add ratingTierClass utility"
```

---

## Task 2: CourtCard Player Pills

**Files:**
- Modify: `src/features/rounds/CourtCard.jsx`

The player pill `<div>` currently has these relevant classes:
```
'text-xs truncate py-0.5 px-2 rounded-md border mb-0.5'
team === 1 ? 'bg-white/70 border-blue-100' : 'bg-white/70 border-orange-100'
```

Adding `border-l-4` makes the left border 4px wide. Adding `ratingTierClass(p.ranking)` colors only the left border. The team-color class (`border-blue-100` / `border-orange-100`) colors top/right/bottom at 1px — the left is overridden by the tier color.

- [ ] **Step 1: Update the import in `src/features/rounds/CourtCard.jsx`**

Find:
```jsx
import { fullName } from '../../lib/playerName'
```

Replace with:
```jsx
import { fullName, ratingTierClass } from '../../lib/playerName'
```

- [ ] **Step 2: Add tier class to player pill**

Find the className array in the player `<div>` (the pill):
```jsx
                    className={[
                      'text-xs truncate py-0.5 px-2 rounded-md border mb-0.5',
                      isFlashing ? 'animate-flash-gold' : 'animate-fade-in-up',
                      team === 1 ? 'bg-white/70 border-blue-100' : 'bg-white/70 border-orange-100',
                      isSwapTarget ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                      canWrite && !isCommitted ? 'cursor-pointer hover:bg-white hover:text-emerald-700' : 'text-stone-700',
                    ].filter(Boolean).join(' ')}
```

Replace with:
```jsx
                    className={[
                      'text-xs truncate py-0.5 px-2 rounded-md border border-l-4 mb-0.5',
                      isFlashing ? 'animate-flash-gold' : 'animate-fade-in-up',
                      team === 1 ? 'bg-white/70 border-blue-100' : 'bg-white/70 border-orange-100',
                      ratingTierClass(p.ranking),
                      isSwapTarget ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                      canWrite && !isCommitted ? 'cursor-pointer hover:bg-white hover:text-emerald-700' : 'text-stone-700',
                    ].filter(Boolean).join(' ')}
```

- [ ] **Step 3: Run tests and build**

```bash
npm test -- --run && npm run build
```

Expected: all tests pass, build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/rounds/CourtCard.jsx
git commit -m "feat: add skill tier left-border stripe to court card player pills"
```

---

## Task 3: ParticipantPanel Rows

**Files:**
- Modify: `src/features/rounds/ParticipantPanel.jsx`

The participant list `<label>` row currently has:
```
flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-stone-50 transition-colors
```

Adding `border-l-4` and the tier class gives each row a colored left stripe. The `rounded-lg` clips the stripe at the corners — this is intentional and looks clean.

- [ ] **Step 1: Update the import in `src/features/rounds/ParticipantPanel.jsx`**

Find:
```jsx
import { fullName } from '../../lib/playerName'
```

Replace with:
```jsx
import { fullName, ratingTierClass } from '../../lib/playerName'
```

- [ ] **Step 2: Add tier class to the label row**

Find:
```jsx
          <label key={p.id} className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-stone-50 transition-colors">
```

Replace with:
```jsx
          <label key={p.id} className={`flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-stone-50 transition-colors border-l-4 ${ratingTierClass(p.ranking)}`}>
```

- [ ] **Step 3: Run tests and build**

```bash
npm test -- --run && npm run build
```

Expected: all tests pass, build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/rounds/ParticipantPanel.jsx
git commit -m "feat: add skill tier left-border stripe to participant list rows"
```

---

## Task 4: Push

- [ ] **Step 1: Push to remote**

```bash
git push
```
