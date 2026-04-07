# Recurring Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow organizers to define recurring weekly schedules so each week's event is auto-created on Events page load, with no manual entry required.

**Architecture:** A new `event_templates` table stores recurring schedule definitions (name, day of week, season window). On Events page load (when authenticated), the app checks each active template for a missing next occurrence and inserts it silently. Pure date logic lives in a testable utility module. The existing events list is unchanged — generated events look identical to one-off events.

**Tech Stack:** React 19, Supabase (PostgreSQL + RLS), Tailwind CSS, Vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/003_event_templates.sql` | Create | DB table + RLS + `template_id` column on `events` |
| `src/features/events/schedules.js` | Create | Pure utilities: `DAYS`, `getNextOccurrence` |
| `src/features/events/schedules.test.js` | Create | Vitest unit tests for `getNextOccurrence` |
| `src/features/events/ScheduleModal.jsx` | Create | Modal to add a new recurring schedule |
| `src/pages/Events.jsx` | Modify | Load templates, run generation, render Schedules section |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/003_event_templates.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- event_templates
create table event_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  season_start text not null default '11-01',
  season_end text not null default '05-31',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table event_templates enable row level security;
create policy "public read" on event_templates for select using (true);
create policy "auth insert" on event_templates for insert with check (auth.uid() is not null);
create policy "auth update" on event_templates for update using (auth.uid() is not null);
create policy "auth delete" on event_templates for delete using (auth.uid() is not null);

-- add template_id to events
alter table events
  add column template_id uuid references event_templates(id) on delete set null;
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

In the Supabase dashboard SQL editor, paste and run the migration. Verify:
- The `event_templates` table appears in Table Editor
- The `events` table has a new `template_id` column (nullable)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_event_templates.sql
git commit -m "feat: add event_templates table and template_id to events"
```

---

## Task 2: Pure Date Utility + Tests

**Files:**
- Create: `src/features/events/schedules.js`
- Create: `src/features/events/schedules.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/features/events/schedules.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getNextOccurrence } from './schedules'

// Reference: 2026-04-07 is a Tuesday (day 2), in-season for Nov-May
const TUE = 2

describe('getNextOccurrence', () => {
  const NOV_MAY = { season_start: '11-01', season_end: '05-31' }

  it('returns today if today matches day_of_week and is in season', () => {
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-04-07')).toBe('2026-04-07')
  })

  it('returns next matching weekday when today does not match', () => {
    // 2026-04-06 is Monday; next Tuesday is 2026-04-07
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-04-06')).toBe('2026-04-07')
  })

  it('returns null when outside season (summer)', () => {
    // 2026-08-04 is a Tuesday but August is outside Nov-May
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-08-04')).toBeNull()
  })

  it('returns date when today is the last day of the season', () => {
    // 2026-05-26 is a Tuesday (7 weeks after 2026-04-07), still in season
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-05-26')).toBe('2026-05-26')
  })

  it('returns null when next matching weekday falls after season end', () => {
    // 2026-05-28 is Thursday; next Tuesday 2026-06-02 is outside season
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-05-28')).toBeNull()
  })

  it('handles non-wrapping season (e.g. June–August)', () => {
    // 2026-07-07 is a Tuesday (13 weeks after 2026-04-07)
    expect(getNextOccurrence(
      { day_of_week: TUE, season_start: '06-01', season_end: '08-31' },
      '2026-07-07'
    )).toBe('2026-07-07')
  })

  it('returns null outside non-wrapping season', () => {
    expect(getNextOccurrence(
      { day_of_week: TUE, season_start: '06-01', season_end: '08-31' },
      '2026-04-07'
    )).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run
```

Expected: 7 failures mentioning `getNextOccurrence is not a function` or similar.

- [ ] **Step 3: Write the implementation**

Create `src/features/events/schedules.js`:

```js
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isInSeason(mmdd, seasonStart, seasonEnd) {
  // seasonStart > seasonEnd means the season wraps across Jan 1 (e.g. Nov–May)
  const wraps = seasonStart > seasonEnd
  if (wraps) {
    return mmdd >= seasonStart || mmdd <= seasonEnd
  }
  return mmdd >= seasonStart && mmdd <= seasonEnd
}

/**
 * Returns the next date (YYYY-MM-DD) >= todayStr whose weekday matches
 * template.day_of_week and which falls within the season window.
 * Returns null if no such date exists within the next 7 days.
 *
 * @param {{ day_of_week: number, season_start: string, season_end: string }} template
 * @param {string} todayStr - YYYY-MM-DD
 * @returns {string|null}
 */
export function getNextOccurrence(template, todayStr) {
  const { day_of_week, season_start, season_end } = template
  const today = new Date(todayStr + 'T00:00:00')

  // Find the next date (including today) that matches the target weekday
  const candidate = new Date(today)
  for (let i = 0; i < 7; i++) {
    if (candidate.getDay() === day_of_week) break
    candidate.setDate(candidate.getDate() + 1)
  }

  const candidateStr = candidate.toISOString().split('T')[0]
  const mmdd = candidateStr.slice(5) // 'MM-DD'

  return isInSeason(mmdd, season_start, season_end) ? candidateStr : null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run
```

Expected: all tests pass (the 7 new ones plus all 14 existing algorithm tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/events/schedules.js src/features/events/schedules.test.js
git commit -m "feat: add getNextOccurrence utility with tests"
```

---

## Task 3: ScheduleModal Component

**Files:**
- Create: `src/features/events/ScheduleModal.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react'
import Modal from '../../components/Modal'
import { DAYS } from './schedules'

export default function ScheduleModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState(2) // Tuesday default
  const [seasonStart, setSeasonStart] = useState('11-01')
  const [seasonEnd, setSeasonEnd] = useState('05-31')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        day_of_week: Number(dayOfWeek),
        season_start: seasonStart,
        season_end: seasonEnd,
      })
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <Modal title="Add Schedule" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Tuesday Morning Choose-Up"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Day of Week</label>
          <select
            className={inputClass}
            value={dayOfWeek}
            onChange={e => setDayOfWeek(e.target.value)}
          >
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Season Start (MM-DD)</label>
            <input
              className={inputClass}
              value={seasonStart}
              onChange={e => setSeasonStart(e.target.value)}
              placeholder="11-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Season End (MM-DD)</label>
            <input
              className={inputClass}
              value={seasonEnd}
              onChange={e => setSeasonEnd(e.target.value)}
              placeholder="05-31"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Add Schedule'}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/events/ScheduleModal.jsx
git commit -m "feat: add ScheduleModal component"
```

---

## Task 4: Wire Up Events Page

**Files:**
- Modify: `src/pages/Events.jsx`

Replace the entire file with the following. Key additions vs. existing code:
- Import `getNextOccurrence`, `DAYS`, `ScheduleModal`
- Add `templates` state
- `loadEvents` fetches templates in parallel, runs generation when session exists, re-fetches events after generation
- `handleSaveSchedule` inserts to `event_templates`
- `handleToggleTemplate` updates `is_active`
- Schedules section rendered below the events list (auth-only)

- [ ] **Step 1: Update Events.jsx**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import EventModal from '../features/events/EventModal'
import ScheduleModal from '../features/events/ScheduleModal'
import { getNextOccurrence, DAYS } from '../features/events/schedules'
import Spinner from '../components/Spinner'

export default function Events() {
  const session = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const loadEvents = useCallback(async () => {
    const [{ data: evData }, { data: tmplData }] = await Promise.all([
      supabase.from('events').select('*').order('date', { ascending: false }),
      supabase.from('event_templates').select('*').order('created_at'),
    ])

    const activeTemplates = (tmplData ?? []).filter(t => t.is_active)

    if (session && activeTemplates.length > 0) {
      await generateMissingEvents(activeTemplates)
      const { data: refreshed } = await supabase
        .from('events').select('*').order('date', { ascending: false })
      setEvents(refreshed ?? [])
    } else {
      setEvents(evData ?? [])
    }

    setTemplates(tmplData ?? [])
    setLoading(false)
  }, [session])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function generateMissingEvents(activeTemplates) {
    const today = new Date().toISOString().split('T')[0]
    const templateIds = activeTemplates.map(t => t.id)

    const { data: existing } = await supabase
      .from('events')
      .select('template_id, date')
      .in('template_id', templateIds)

    for (const template of activeTemplates) {
      const nextDate = getNextOccurrence(template, today)
      if (!nextDate) continue

      const alreadyExists = (existing ?? []).some(
        e => e.template_id === template.id && e.date === nextDate
      )
      if (alreadyExists) continue

      const { error } = await supabase.from('events').insert({
        name: template.name,
        date: nextDate,
        template_id: template.id,
      })
      if (error) console.error('Failed to generate event:', error)
    }
  }

  async function handleSave(form) {
    const { error } = await supabase.from('events').insert(form)
    if (error) { alert(`Failed to save: ${error.message}`); return }
    setShowModal(false)
    loadEvents()
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this event?')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { alert(`Failed to delete: ${error.message}`); return }
    loadEvents()
  }

  async function handleSaveSchedule(form) {
    const { error } = await supabase.from('event_templates').insert(form)
    if (error) { alert(`Failed to save schedule: ${error.message}`); return }
    setShowScheduleModal(false)
    loadEvents()
  }

  async function handleToggleTemplate(id, isActive) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: isActive } : t))
    const { error } = await supabase
      .from('event_templates').update({ is_active: isActive }).eq('id', id)
    if (error) console.error('Failed to update schedule:', error)
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-lg mx-auto">
      {session && (
        <div className="px-4 pt-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            + Add Event
          </button>
        </div>
      )}

      <ul className="divide-y divide-stone-100 mt-3 mx-4 bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
        {events.map(ev => (
          <li
            key={ev.id}
            onClick={() => navigate(`/events/${ev.id}`)}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 cursor-pointer transition-colors"
          >
            <div>
              <div className="font-semibold text-stone-800">{ev.name}</div>
              <div className="text-sm text-stone-400 mt-0.5">{ev.date}</div>
            </div>
            {session && (
              <button
                onClick={e => handleDelete(e, ev.id)}
                className="text-stone-300 hover:text-red-500 text-sm px-2 transition-colors"
              >
                ✕
              </button>
            )}
          </li>
        ))}
        {events.length === 0 && (
          <li className="px-4 py-10 text-center text-stone-400 text-sm">No events yet</li>
        )}
      </ul>

      {session && (
        <div className="px-4 mt-6 pb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Recurring Schedules
            </span>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              + Add Schedule
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-xs text-stone-400 py-2">No recurring schedules</p>
          ) : (
            <ul className="divide-y divide-stone-100 bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
              {templates.map(t => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-stone-800">{t.name}</div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {DAYS[t.day_of_week]} · {t.season_start} – {t.season_end}
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.is_active}
                      onChange={e => handleToggleTemplate(t.id, e.target.checked)}
                      className="accent-emerald-600"
                    />
                    <span className="text-xs text-stone-500">
                      {t.is_active ? 'Active' : 'Paused'}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showModal && <EventModal onSave={handleSave} onClose={() => setShowModal(false)} />}
      {showScheduleModal && (
        <ScheduleModal onSave={handleSaveSchedule} onClose={() => setShowScheduleModal(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --run
```

Expected: 21 tests pass (14 algorithm + 7 schedule).

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Manual test**

1. Log in, go to Events page
2. Click "+ Add Schedule", enter "Tuesday Morning Choose-Up", Day = Tuesday, leave season defaults, save
3. The schedule appears in the Recurring Schedules list
4. Reload the page — the next Tuesday's event should appear automatically in the events list
5. Reload again — no duplicate event is created
6. Toggle the schedule to "Paused" — future reloads no longer generate events
7. Delete the generated event — template remains, next reload regenerates it

- [ ] **Step 5: Commit**

```bash
git add src/pages/Events.jsx
git commit -m "feat: recurring events — generation on load, schedules UI"
```

---

## Self-Review

**Spec coverage:**
- ✅ `event_templates` table with all specified columns → Task 1
- ✅ `template_id` FK on `events` with `ON DELETE SET NULL` → Task 1
- ✅ Client-side generation on Events page load → Task 4
- ✅ Generation only runs when session exists → Task 4
- ✅ Season window respected including year-wrap → Task 2
- ✅ Active toggle pauses generation without deleting events → Task 4
- ✅ Deleting generated event doesn't delete template → no special code needed (events.delete is independent)
- ✅ One-off events unchanged → Task 4 (events without template_id work identically)
- ✅ Multiple templates supported → Task 4 (loops over all active templates)
- ✅ No duplicate generation (existence check before insert) → Task 4

**No placeholders:** All steps have complete code.

**Type consistency:** `day_of_week` is stored as integer in DB; `Number(dayOfWeek)` coerces the select string value on save; `DAYS[t.day_of_week]` uses it as index — consistent throughout.
