# Player Block List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins mark pairs of players who should not share a court, with a soft avoidance pass run at assignment time when "Avoid Blocks" is enabled, and amber visual flagging of any unresolvable conflicts on court cards.

**Architecture:** A `player_blocks` Supabase table stores blocked pairs in canonical (`player_id_a < player_id_b`) order. A new `resolveBlocks()` function — separate from the existing `suggest()` — does a greedy swap pass on any `suggest()` output. Violations flow as state from `RoundDetail` through `CourtGrid` to `CourtCard`. Block list management is a new section on `PlayerDetail`.

**Tech Stack:** React, Supabase (PostgREST), Tailwind CSS, Vitest

---

## File Map

| Action | File |
|---|---|
| Create | `supabase/migrations/004_player_blocks.sql` |
| Modify | `src/features/rounds/algorithms.js` — add `resolveBlocks()` export |
| Modify | `src/features/rounds/algorithms.test.js` — add `resolveBlocks` tests |
| Modify | `src/features/rounds/AlgorithmBar.jsx` — add "Avoid Blocks" checkbox |
| Modify | `src/features/rounds/CourtGrid.jsx` — thread `violations` prop |
| Modify | `src/features/rounds/CourtCard.jsx` — amber badge + player highlights |
| Modify | `src/pages/RoundDetail.jsx` — fetch blocks, call resolveBlocks, manage violations state |
| Modify | `src/pages/PlayerDetail.jsx` — block list management section |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/004_player_blocks.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- player_blocks: one row per blocked pair, canonical order enforced by check constraint
create table player_blocks (
  id          uuid primary key default gen_random_uuid(),
  player_id_a uuid not null references players(id) on delete cascade,
  player_id_b uuid not null references players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (player_id_a < player_id_b),
  unique (player_id_a, player_id_b)
);
alter table player_blocks enable row level security;
create policy "public read" on player_blocks for select using (true);
create policy "auth insert" on player_blocks for insert with check (auth.uid() is not null);
create policy "auth update" on player_blocks for update using (auth.uid() is not null);
create policy "auth delete" on player_blocks for delete using (auth.uid() is not null);
```

- [ ] **Step 2: Apply the migration in Supabase**

Open the Supabase dashboard SQL editor, paste the file contents, and run it. Verify the `player_blocks` table appears in the Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_player_blocks.sql
git commit -m "feat: add player_blocks migration"
```

---

### Task 2: Write Failing Tests for resolveBlocks

**Files:**
- Modify: `src/features/rounds/algorithms.test.js`

- [ ] **Step 1: Add `resolveBlocks` to the import**

Change the first line:
```js
import { parseRank, suggest } from './algorithms'
```
to:
```js
import { parseRank, suggest, resolveBlocks } from './algorithms'
```

- [ ] **Step 2: Add the resolveBlocks test suite at the end of the file**

```js
describe('resolveBlocks', () => {
  // bp(a, b) builds the canonical block key matching what resolveBlocks expects
  function bp(idA, idB) {
    const [a, b] = [idA, idB].sort()
    return `${a}|${b}`
  }

  it('returns courts unchanged and empty violations when blockPairs is empty', () => {
    const courts = [
      { court_number: 1, team1: [makePlayer('a', 'A', 'member', '3.5')], team2: [makePlayer('b', 'B', 'member', '3.5')] },
    ]
    const { courts: out, violations } = resolveBlocks(courts, new Set())
    expect(out).toEqual(courts)
    expect(violations).toHaveLength(0)
  })

  it('swaps a blocked pair apart when a valid swap target exists', () => {
    const p1 = makePlayer('p1', 'P1', 'member', '3.5')
    const p2 = makePlayer('p2', 'P2', 'member', '3.5')
    const p3 = makePlayer('p3', 'P3', 'member', '3.5')
    const p4 = makePlayer('p4', 'P4', 'member', '3.5')
    const p5 = makePlayer('p5', 'P5', 'member', '3.5')
    const p6 = makePlayer('p6', 'P6', 'member', '3.5')
    const p7 = makePlayer('p7', 'P7', 'member', '3.5')
    const p8 = makePlayer('p8', 'P8', 'member', '3.5')
    // p1 and p2 start on the same court; they are blocked
    const courts = [
      { court_number: 1, team1: [p1, p2], team2: [p3, p4] },
      { court_number: 2, team1: [p5, p6], team2: [p7, p8] },
    ]
    const { courts: out, violations } = resolveBlocks(courts, new Set([bp('p1', 'p2')]))
    const c1Ids = [...out[0].team1, ...out[0].team2].map(p => p.id)
    expect(c1Ids.includes('p1') && c1Ids.includes('p2')).toBe(false)
    expect(violations).toHaveLength(0)
  })

  it('reports an unresolved violation when only one court exists', () => {
    const p1 = makePlayer('p1', 'P1', 'member', '3.5')
    const p2 = makePlayer('p2', 'P2', 'member', '3.5')
    const p3 = makePlayer('p3', 'P3', 'member', '3.5')
    const p4 = makePlayer('p4', 'P4', 'member', '3.5')
    const courts = [
      { court_number: 1, team1: [p1, p2], team2: [p3, p4] },
    ]
    const { violations } = resolveBlocks(courts, new Set([bp('p1', 'p2')]))
    expect(violations).toHaveLength(1)
    expect(violations[0].courtNumber).toBe(1)
    const vIds = [violations[0].playerA.id, violations[0].playerB.id].sort()
    expect(vIds).toEqual(['p1', 'p2'])
  })

  it('leaves a violation unresolved when every swap candidate would create a new one', () => {
    const p1 = makePlayer('p1', 'P1', 'member', '3.5')
    const p2 = makePlayer('p2', 'P2', 'member', '3.5')
    const p3 = makePlayer('p3', 'P3', 'member', '3.5')
    const p4 = makePlayer('p4', 'P4', 'member', '3.5')
    const p5 = makePlayer('p5', 'P5', 'member', '3.5')
    const p6 = makePlayer('p6', 'P6', 'member', '3.5')
    const p7 = makePlayer('p7', 'P7', 'member', '3.5')
    const p8 = makePlayer('p8', 'P8', 'member', '3.5')
    const courts = [
      { court_number: 1, team1: [p1, p2], team2: [p3, p4] },
      { court_number: 2, team1: [p5, p6], team2: [p7, p8] },
    ]
    // p1 is blocked with p2 (on same court) AND with every player on court 2
    const blockPairs = new Set([
      bp('p1', 'p2'), bp('p1', 'p5'), bp('p1', 'p6'), bp('p1', 'p7'), bp('p1', 'p8'),
    ])
    const { violations } = resolveBlocks(courts, blockPairs)
    // p1 can't move to court 2 without landing next to a blocked player — violation remains
    expect(violations).toHaveLength(1)
    const vIds = [violations[0].playerA.id, violations[0].playerB.id].sort()
    expect(vIds).toEqual(['p1', 'p2'])
  })
})
```

- [ ] **Step 3: Run tests — verify failure**

```bash
npm test -- algorithms.test.js
```

Expected: FAIL — `resolveBlocks is not a function` (import fails because it doesn't exist yet)

---

### Task 3: Implement resolveBlocks

**Files:**
- Modify: `src/features/rounds/algorithms.js`

- [ ] **Step 1: Add `findViolations` (internal) and `resolveBlocks` (exported) at the bottom of `algorithms.js`**

Append after the last existing function (`riverAssign`):

```js
function findViolations(courts, blockPairs) {
  const violations = []
  for (const court of courts) {
    const all = [...court.team1, ...court.team2]
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const key = [all[i].id, all[j].id].sort().join('|')
        if (blockPairs.has(key)) {
          violations.push({ courtNumber: court.court_number, playerA: all[i], playerB: all[j] })
        }
      }
    }
  }
  return violations
}

/**
 * Greedy post-processing pass that tries to swap blocked players to different courts.
 * Soft constraint: violations that cannot be resolved without creating new ones are left in place.
 * @param {{ court_number: number, team1: object[], team2: object[] }[]} courts - output from suggest()
 * @param {Set<string>} blockPairs - "id1|id2" strings where id1 < id2 (lexicographic)
 * @returns {{ courts: object[], violations: { courtNumber: number, playerA: object, playerB: object }[] }}
 */
export function resolveBlocks(courts, blockPairs) {
  if (!blockPairs || blockPairs.size === 0) return { courts, violations: [] }

  function isBlocked(idA, idB) {
    return blockPairs.has([idA, idB].sort().join('|'))
  }

  function hasConflict(group) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (isBlocked(group[i].id, group[j].id)) return true
      }
    }
    return false
  }

  const result = courts.map(c => ({ ...c, team1: [...c.team1], team2: [...c.team2] }))

  for (let si = 0; si < result.length; si++) {
    let maxPasses = result.length * 4
    while (maxPasses-- > 0) {
      const sourcePlayers = [...result[si].team1, ...result[si].team2]

      // Find first blocked player on this court
      let offender = null
      for (let pi = 0; pi < sourcePlayers.length && !offender; pi++) {
        for (let qi = pi + 1; qi < sourcePlayers.length && !offender; qi++) {
          if (isBlocked(sourcePlayers[pi].id, sourcePlayers[qi].id)) {
            offender = sourcePlayers[pi]
          }
        }
      }
      if (!offender) break // no violations left on this court

      // Try each player on every other court as a swap candidate
      let swapped = false
      for (let ti = 0; ti < result.length && !swapped; ti++) {
        if (ti === si) continue
        const targetPlayers = [...result[ti].team1, ...result[ti].team2]
        for (let ci = 0; ci < targetPlayers.length && !swapped; ci++) {
          const candidate = targetPlayers[ci]
          const sourceAfter = sourcePlayers.map(p => p.id === offender.id ? candidate : p)
          const targetAfter = targetPlayers.map(p => p.id === candidate.id ? offender : p)
          if (!hasConflict(sourceAfter) && !hasConflict(targetAfter)) {
            result[si] = {
              ...result[si],
              team1: result[si].team1.map(p => p.id === offender.id ? candidate : p),
              team2: result[si].team2.map(p => p.id === offender.id ? candidate : p),
            }
            result[ti] = {
              ...result[ti],
              team1: result[ti].team1.map(p => p.id === candidate.id ? offender : p),
              team2: result[ti].team2.map(p => p.id === candidate.id ? offender : p),
            }
            swapped = true
          }
        }
      }
      if (!swapped) break // no valid swap found — leave remaining violations on this court
    }
  }

  return { courts: result, violations: findViolations(result, blockPairs) }
}
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
npm test -- algorithms.test.js
```

Expected: All tests PASS (existing tests unaffected; new `resolveBlocks` suite passes)

- [ ] **Step 3: Commit**

```bash
git add src/features/rounds/algorithms.js src/features/rounds/algorithms.test.js
git commit -m "feat: add resolveBlocks algorithm for player block list"
```

---

### Task 4: Add "Avoid Blocks" Checkbox to AlgorithmBar

**Files:**
- Modify: `src/features/rounds/AlgorithmBar.jsx`

- [ ] **Step 1: Add the checkbox to the options row**

In the middle `<div>` that contains Member Priority and Rotation checkboxes, add the "Avoid Blocks" checkbox between Rotation and the gender group:

```jsx
<div className="flex-1 flex items-center gap-2 flex-wrap justify-center">
  <Checkbox
    label="Member Priority"
    checked={!!options.memberPriority}
    onChange={e => onOptionChange('memberPriority', e.target.checked)}
  />
  <Checkbox
    label="Rotation"
    checked={!!options.rotationPriority}
    onChange={e => onOptionChange('rotationPriority', e.target.checked)}
  />
  <Checkbox
    label="Avoid Blocks"
    checked={!!options.honorBlocks}
    onChange={e => onOptionChange('honorBlocks', e.target.checked)}
  />
  {/* Mutually exclusive gender group */}
  <div className="flex items-center gap-2 flex-wrap bg-stone-100 border border-stone-300 rounded-lg px-2 py-1">
    {GENDER_OPTIONS.map(opt => (
      <Checkbox
        key={opt.key ?? '__any__'}
        label={opt.label}
        checked={opt.key === null ? noGenderOption : !!options[opt.key]}
        onChange={() => handleGender(opt.key)}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/features/rounds/AlgorithmBar.jsx
git commit -m "feat: add Avoid Blocks checkbox to AlgorithmBar"
```

---

### Task 5: Wire Block Pairs and Violations into RoundDetail

**Files:**
- Modify: `src/pages/RoundDetail.jsx`

- [ ] **Step 1: Add `resolveBlocks` to the algorithms import**

Change:
```js
import { suggest } from '../features/rounds/algorithms'
```
to:
```js
import { suggest, resolveBlocks } from '../features/rounds/algorithms'
```

- [ ] **Step 2: Add `allBlocks` and `violations` state**

Add alongside existing state declarations (after `const [sittingOutCounts, setSittingOutCounts] = useState({})`):
```js
const [allBlocks, setAllBlocks] = useState([])
const [violations, setViolations] = useState([])
```

- [ ] **Step 3: Fetch all player_blocks in load()**

In the `Promise.all` inside `load()`, add `player_blocks` as the ninth query entry. The full destructured array becomes:

```js
const [
  { data: rd },
  { data: ev },
  { data: players },
  { data: cts },
  { data: parts },
  { data: assignments },
  { data: res },
  { data: priorRoundRows },
  { data: blocksData },
] = await Promise.all([
  supabase.from('rounds').select('*').eq('id', roundId).single(),
  supabase.from('events').select('*').eq('id', eventId).single(),
  supabase.from('players').select('*').eq('plays_pickleball', true).order('last_name').order('first_name'),
  supabase.from('active_courts').select('*').eq('round_id', roundId).order('court_number'),
  supabase.from('round_participants').select('player_id').eq('round_id', roundId),
  supabase.from('court_assignments').select('*, players(*)').eq('round_id', roundId),
  supabase.from('court_results').select('*').eq('round_id', roundId),
  supabase.from('rounds').select('id, round_number').eq('event_id', eventId).eq('is_committed', true).neq('id', roundId).order('round_number'),
  supabase.from('player_blocks').select('player_id_a, player_id_b'),
])
```

After `setLoading(false)` at the end of the load function, add:
```js
setAllBlocks(blocksData ?? [])
```

- [ ] **Step 4: Update `handleSuggest` to call resolveBlocks when honorBlocks is on**

Replace the existing `handleSuggest` function:

```js
function handleSuggest(algorithmKey) {
  const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
  const participatingPlayers = allPlayers.filter(p => participants.has(p.id))
  const mergedOptions = {
    memberPriority: options.memberPriority,
    rotationPriority: options.rotationPriority,
    genderPriority: options.genderPriority,
    mixedDoubles: options.mixedDoubles,
    [algorithmKey]: true,
  }
  const draft = suggest({ participants: participatingPlayers, activeCourts, options: mergedOptions, priorRounds, priorRoundResult, sittingOutCounts })

  if (options.honorBlocks && allBlocks.length > 0) {
    const participantIds = new Set(participatingPlayers.map(p => p.id))
    const blockPairs = new Set(
      allBlocks
        .filter(b => participantIds.has(b.player_id_a) && participantIds.has(b.player_id_b))
        .map(b => `${b.player_id_a}|${b.player_id_b}`)
    )
    const { courts: resolved, violations: newViolations } = resolveBlocks(draft, blockPairs)
    setDraftAssignments(resolved)
    setViolations(newViolations)
  } else {
    setDraftAssignments(draft)
    setViolations([])
  }

  setSwapTarget(null)
  setSuggestKey(k => k + 1)
}
```

- [ ] **Step 5: Clear violations when the user manually swaps two players**

In `handlePlayerClick`, in the block that applies a swap (after the `setFlashedIds` call), add `setViolations([])`:

```js
setDraftAssignments(prev => prev.map(court => ({
  ...court,
  team1: court.team1.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
  team2: court.team2.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
})))
setFlashedIds(new Set([swapTarget.id, player.id]))
setTimeout(() => setFlashedIds(new Set()), 700)
setSwapTarget(null)
setViolations([])
```

- [ ] **Step 6: Pass violations to CourtGrid — only when honorBlocks is on**

In the JSX where `CourtGrid` is rendered, add the `violations` prop:

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
  violations={options.honorBlocks ? violations : []}
/>
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/RoundDetail.jsx
git commit -m "feat: fetch block pairs and wire violations into RoundDetail"
```

---

### Task 6: Thread Violations Through CourtGrid

**Files:**
- Modify: `src/features/rounds/CourtGrid.jsx`

- [ ] **Step 1: Accept `violations` prop and pass per-court violations to CourtCard**

Replace the entire `CourtGrid` component:

```jsx
export default function CourtGrid({ courts, draftAssignments, committedAssignments, results, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite, holdingPen, suggestKey, flashedIds, swapTargetId, violations = [] }) {
  const { showRankings } = useRankings()
  return (
    <div className="flex-1 p-2 overflow-y-auto">
      <div className="text-xs font-bold uppercase text-stone-400 mb-2">Courts</div>
      <div className="grid grid-cols-2 gap-2">
        {courts.map(court => {
          const assignments = isCommitted ? committedAssignments : draftAssignments
          const courtAssignments = assignments.find(a => a.court_number === court.court_number) ?? { team1: [], team2: [] }
          const result = results.find(r => r.court_number === court.court_number)
          const courtViolations = violations.filter(v => v.courtNumber === court.court_number)
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
              violations={courtViolations}
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
                {showRankings && p.ranking ? <span className="text-stone-400 ml-1">{p.ranking}</span> : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/rounds/CourtGrid.jsx
git commit -m "feat: thread violations prop through CourtGrid to CourtCard"
```

---

### Task 7: Violation Display in CourtCard

**Files:**
- Modify: `src/features/rounds/CourtCard.jsx`

- [ ] **Step 1: Accept `violations` prop and compute the set of violating player IDs**

Replace the component signature line and add `violatingIds` inside the component body:

```jsx
export default function CourtCard({ courtNumber, isActive, team1, team2, winningTeam, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite, suggestKey, flashedIds, swapTargetId, violations = [] }) {
  const { showRankings } = useRankings()
  const violatingIds = new Set(violations.flatMap(v => [v.playerA.id, v.playerB.id]))
```

- [ ] **Step 2: Add amber badge in the court header when violations exist**

Replace the existing header `<div>` (the one with `Court {courtNumber}` and the Active checkbox):

```jsx
<div className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold ${isActive ? 'bg-gradient-to-r from-emerald-700 to-emerald-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
  <div className="flex items-center gap-1.5">
    <span>Court {courtNumber}</span>
    {violations.length > 0 && (
      <span className="bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded text-xs font-semibold">
        ⚠ Block conflict
      </span>
    )}
  </div>
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
```

- [ ] **Step 3: Highlight violating players in amber**

In the player row `className` array, replace the existing team color and ranking tier logic with one that checks `violatingIds` first:

```jsx
className={[
  'text-xs truncate py-0.5 px-2 rounded-md border border-l-4 mb-0.5',
  isFlashing ? 'animate-flash-gold' : 'animate-fade-in-up',
  violatingIds.has(p.id)
    ? 'bg-amber-50 border-amber-300 text-amber-800'
    : team === 1 ? 'bg-white/70 border-blue-100' : 'bg-white/70 border-orange-100',
  !violatingIds.has(p.id) && showRankings ? ratingTierClass(p.ranking) : '',
  isSwapTarget ? 'ring-2 ring-amber-400 ring-offset-1' : '',
  canWrite && !isCommitted ? 'cursor-pointer hover:bg-white hover:text-emerald-700' : 'text-stone-700',
].filter(Boolean).join(' ')}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/rounds/CourtCard.jsx
git commit -m "feat: show block violation badge and player highlights on CourtCard"
```

---

### Task 8: Block List Management in PlayerDetail

**Files:**
- Modify: `src/pages/PlayerDetail.jsx`

- [ ] **Step 1: Add `blockList` and `allPlayers` state**

Add after the existing `const [showEdit, setShowEdit] = useState(false)`:

```js
const [blockList, setBlockList] = useState([])
const [allPlayers, setAllPlayers] = useState([])
```

- [ ] **Step 2: Add block list and players fetch to `load()`**

The existing `Promise.all` in `load()` has 3 entries. Expand it to 5:

```js
const [
  { data: playerData, error: playerError },
  { data: participations, error: partError },
  { data: assignments, error: asnError },
  { data: blocksData },
  { data: playersData },
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
  supabase
    .from('player_blocks')
    .select('id, player_id_a, player_id_b')
    .or(`player_id_a.eq.${playerId},player_id_b.eq.${playerId}`),
  supabase
    .from('players')
    .select('id, first_name, last_name')
    .eq('plays_pickleball', true)
    .order('last_name')
    .order('first_name'),
])
```

After the existing `setPlayer(playerData)` and `setStats(...)` calls, add:

```js
setAllPlayers(playersData ?? [])
const playersById = Object.fromEntries((playersData ?? []).map(p => [p.id, p]))
setBlockList(
  (blocksData ?? [])
    .map(b => ({
      blockId: b.id,
      player: b.player_id_a === playerId ? playersById[b.player_id_b] : playersById[b.player_id_a],
    }))
    .filter(b => b.player)
)
```

- [ ] **Step 3: Add block add/remove handlers**

Add after the existing `handleDelete` function:

```js
async function handleAddBlock(otherPlayerId) {
  const [a, b] = [playerId, otherPlayerId].sort()
  const { error } = await supabase.from('player_blocks').insert({ player_id_a: a, player_id_b: b })
  if (error) { alert(`Failed to add block: ${error.message}`); return }
  load()
}

async function handleRemoveBlock(blockId) {
  const { error } = await supabase.from('player_blocks').delete().eq('id', blockId)
  if (error) { alert(`Failed to remove block: ${error.message}`); return }
  load()
}
```

- [ ] **Step 4: Add `BlockPlayerSelect` helper component above the `PlayerDetail` export**

Insert before `export default function PlayerDetail()`:

```jsx
function BlockPlayerSelect({ allPlayers, blockedIds, onAdd }) {
  const available = allPlayers.filter(p => !blockedIds.has(p.id))
  if (available.length === 0) return null
  return (
    <select
      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-600"
      value=""
      onChange={e => { if (e.target.value) onAdd(e.target.value) }}
    >
      <option value="">Add player to block list…</option>
      {available.map(p => (
        <option key={p.id} value={p.id}>{fullName(p)}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 5: Add Block List section to the PlayerDetail JSX**

Add a new section after the closing `</div>` of the stats card section and before the `{showEdit && ...}` block:

```jsx
{session && (
  <div className="px-4 pb-4">
    <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">
      Block List
    </div>
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-4">
      {blockList.length === 0 && (
        <p className="text-xs text-stone-400 mb-3">No blocked players.</p>
      )}
      {blockList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {blockList.map(({ blockId, player }) => (
            <span
              key={blockId}
              className="inline-flex items-center gap-1 text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-full"
            >
              {fullName(player)}
              <button
                onClick={() => handleRemoveBlock(blockId)}
                className="text-red-400 hover:text-red-600 font-bold leading-none"
                aria-label={`Remove block for ${fullName(player)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <BlockPlayerSelect
        allPlayers={allPlayers}
        blockedIds={new Set([playerId, ...blockList.map(b => b.player.id)])}
        onAdd={handleAddBlock}
      />
    </div>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/PlayerDetail.jsx
git commit -m "feat: add block list management to PlayerDetail"
```
