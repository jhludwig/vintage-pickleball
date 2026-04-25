# Block List Feature — Design Spec

**Date:** 2026-04-24
**Status:** Approved

---

## Overview

Each player can have a list of other players they do not want to be assigned to the same court with. Admins manage these lists. At court assignment time, a new "Avoid Blocks" option in the AlgorithmBar enables block avoidance. The constraint is soft — the algorithm makes a best-effort attempt to honor blocks but will not fail if separation is impossible. Any violations that remain are shown visually on the affected court cards.

---

## Data Model

One new Supabase table:

```sql
player_blocks (
  id          uuid primary key default gen_random_uuid(),
  player_id_a uuid not null references players(id) on delete cascade,
  player_id_b uuid not null references players(id) on delete cascade,
  created_at  timestamptz default now(),
  check (player_id_a < player_id_b),
  unique (player_id_a, player_id_b)
)
```

**Key decisions:**

- The `check (player_id_a < player_id_b)` constraint enforces a canonical ordering — one row covers both directions, making blocking inherently mutual.
- The `unique (player_id_a, player_id_b)` constraint prevents duplicate entries.
- `on delete cascade` on both foreign keys automatically removes a player's block entries when the player is deleted.
- No changes to the `players` table.

---

## Algorithm Changes

Block avoidance is implemented as a **post-processing layer** that wraps the existing `suggest()` output. The existing algorithm branches (random, rank, social, river) are not modified.

### New inputs to `suggest()`

| Parameter | Type | Description |
|---|---|---|
| `blockPairs` | `Set<string>` | `"id1\|id2"` strings (id1 < id2) for all blocked pairs among current participants |
| `options.honorBlocks` | `boolean` | Whether to apply block avoidance |

### `resolveBlocks()` post-processing pass

When `honorBlocks` is `true` and `blockPairs` is non-empty, after the normal assignment is produced:

1. Scan each court for violations — any two players on the same court whose canonicalized pair key exists in `blockPairs`.
2. For each violation, search for a player on a different court to swap with. A valid swap candidate must not introduce any new violation (checked against all existing pairs on both affected courts).
3. Swaps are applied greedily; no exhaustive backtracking search.
4. Violations that cannot be resolved remain in the output.

### Return value change

`suggest()` gains a `violations` field in its return value:

```js
{
  courts: [{ court_number, team1, team2 }, ...],
  violations: [{ courtNumber, playerA, playerB }, ...]
}
```

`violations` is always returned (empty array when none), regardless of whether `honorBlocks` is on. This allows the UI to always check for conflicts if desired.

### Data fetching in `RoundDetail`

`RoundDetail` fetches all `player_blocks` rows where either `player_id_a` or `player_id_b` is among the current round's participants, builds the `blockPairs` Set, and passes it to `suggest()`.

---

## UI Changes

### AlgorithmBar

A new **"Avoid Blocks"** checkbox is added to the options row alongside Member Priority and Rotation. It is always visible (not conditional on whether any blocks exist). It is controlled by `options.honorBlocks`.

### PlayerDetail page

A new **Block List** section is added below the season stats card. It is only visible when the user is logged in (admin).

- Current blocked players are displayed as removable tags — player name + × button. Clicking × removes the block immediately.
- Below the tags, a searchable dropdown lists active players (excluding the current player and anyone already on the block list). Selecting a player adds the block immediately — no separate save button.
- If the block list is empty and the user is not logged in, the section is hidden entirely.

### CourtCard

When `honorBlocks` is `true` and a court's assignment contains one or more violations:

- The court card shows a small amber **⚠ Block conflict** badge.
- The names of the conflicting players are highlighted in amber text.
- Multiple violations on the same court each get their own highlight.
- No warning is shown when `honorBlocks` is `false`, even if blocks exist in the data.

---

## Scope Boundaries

- Block lists are admin-managed only. There is no player self-service flow.
- Blocking is always mutual — one entry covers both directions.
- The constraint is soft. The algorithm never fails due to blocks; it surfaces unresolved violations instead.
- No notification is sent to players when they are added to or removed from a block list.
