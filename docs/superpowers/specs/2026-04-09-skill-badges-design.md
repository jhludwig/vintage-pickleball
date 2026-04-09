# DUPR Skill Badges — Design Spec

## Goal

Color-code player ratings on court card name pills and the participant list so organizers can quickly assess skill distribution at a glance.

## Scope

Two surfaces on the round detail page only:
- **CourtCard** player name pills
- **ParticipantPanel** player rows

No other pages or components are changed.

---

## Rating Tiers

| Tier | Range | Tailwind class |
|---|---|---|
| Elite | 5.5+ | `border-l-purple-500` |
| Advanced | 4.5–5.49 | `border-l-blue-500` |
| Intermediate | 3.5–4.49 | `border-l-emerald-500` |
| Beginner | 2.5–3.49 | `border-l-amber-400` |
| Unrated | < 2.5 or non-numeric | `border-l-stone-300` |

Ratings below 2.5 are treated the same as unrated (stone/gray) — no separate tier.

---

## Architecture

**New utility:** `ratingTierClass(ranking)` added to `src/lib/playerName.js`.

```js
export function ratingTierClass(ranking) {
  const r = parseFloat(ranking)
  if (isNaN(r) || r < 2.5) return 'border-l-stone-300'
  if (r >= 5.5) return 'border-l-purple-500'
  if (r >= 4.5) return 'border-l-blue-500'
  if (r >= 3.5) return 'border-l-emerald-500'
  return 'border-l-amber-400'
}
```

All returned class names are string literals — Tailwind's content scanner will include them at build time.

---

## Visual Changes

### CourtCard player pills

Each player `<div>` pill gains `border-l-4` (widens left border to 4px) plus the tier class. The existing team-color border (`border-blue-100` team 1, `border-orange-100` team 2) remains on top/right/bottom at 1px. Result: a colored left stripe on every name chip, distinct from the team color.

Before (relevant classes):
```
border bg-white/70 border-blue-100
```

After:
```
border border-l-4 bg-white/70 border-blue-100 {ratingTierClass(p.ranking)}
```

### ParticipantPanel player rows

Each `<label>` row gains `border-l-4` plus the tier class. The existing `rounded-lg` clips the stripe slightly at corners — standard, clean appearance.

Before:
```
flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-stone-50 transition-colors
```

After:
```
flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-stone-50 transition-colors border-l-4 {ratingTierClass(p.ranking)}
```

---

## Files

| File | Action | Purpose |
|---|---|---|
| `src/lib/playerName.js` | Modify | Add `ratingTierClass(ranking)` utility |
| `src/lib/playerName.test.js` | Create | Unit tests for tier logic |
| `src/features/rounds/CourtCard.jsx` | Modify | Add `border-l-4` + tier class to player pills |
| `src/features/rounds/ParticipantPanel.jsx` | Modify | Add `border-l-4` + tier class to label rows |

---

## Tests

`src/lib/playerName.test.js` covers:
- `'5.5'` → `border-l-purple-500`
- `'6.0'` → `border-l-purple-500`
- `'4.5'` → `border-l-blue-500`
- `'5.49'` → `border-l-blue-500`
- `'3.5'` → `border-l-emerald-500`
- `'4.49'` → `border-l-emerald-500`
- `'2.5'` → `border-l-amber-400`
- `'3.49'` → `border-l-amber-400`
- `'2.4'` → `border-l-stone-300`
- `''` (empty string) → `border-l-stone-300`
- `'N/A'` (non-numeric) → `border-l-stone-300`

---

## Out of Scope

- PlayerTable rankings column
- PlayerDetail stats page
- Players list page
- Any legend/key explaining the colors
- Drag-and-drop or interactive tier filtering
