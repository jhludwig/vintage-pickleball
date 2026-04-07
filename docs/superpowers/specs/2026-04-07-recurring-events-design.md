# Recurring Events — Design Spec

## Goal

Allow organizers to define recurring weekly schedules so that each week's event is created automatically, without manual entry each time.

## Architecture

**New table: `event_templates`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | e.g., "Tuesday Morning Choose-Up" |
| `day_of_week` | integer | 0 = Sunday … 6 = Saturday |
| `season_start` | text | MM-DD format, default `"11-01"` |
| `season_end` | text | MM-DD format, default `"05-31"` |
| `is_active` | boolean | default true; false = paused, no new events generated |
| `created_at` | timestamptz | |

RLS: public read, authenticated write (same pattern as `events`).

**Modified table: `events`**

Add column `template_id uuid REFERENCES event_templates(id) ON DELETE SET NULL`. Nullable. One-off events have `null`; auto-generated events have the template's id.

---

## Generation Logic

Runs client-side on every Events page load, before rendering.

For each `event_templates` row where `is_active = true`:

1. Compute `nextDate`: the nearest future date (including today) whose weekday matches `day_of_week` and which falls within the season window. Season spans two calendar years (e.g., Nov 1 2025 – May 31 2026), so the comparison must account for year wrap.

2. If today is outside the season window (June 1 – Oct 31), skip — do not generate.

3. Query `events` for a row where `template_id = template.id AND date = nextDate`.

4. If none found, insert a new event: `{ name: template.name, date: nextDate, template_id: template.id }`.

5. If creation fails, log to console and continue. Do not surface an error to the user.

After generation completes (all templates processed), load and render the events list normally.

---

## UI Changes

### Events page

- Below the existing "+ Add Event" button (auth-only section), add a **"Schedules" section** with:
  - A label "Recurring Schedules"
  - List of all `event_templates` rows, each showing: name, day of week (spelled out), active toggle (auth-only)
  - "+ Add Schedule" button (auth-only)

- The main events list is unchanged. Generated events look identical to one-off events.

### Add Schedule modal

Fields:
- **Name** — text input, required
- **Day of week** — dropdown (Sunday … Saturday)
- **Season start** — text input, default `11-01`, format MM-DD
- **Season end** — text input, default `05-31`, format MM-DD

On save: insert into `event_templates`, then re-run generation logic, then reload events list.

### Active toggle

Toggling a template inactive stops future generation but does not delete any already-created events. Toggling back active resumes generation on the next page load.

### Deleting a generated event

Works exactly like deleting a one-off event. Only that week's instance is removed. The template continues generating future occurrences.

---

## Out of Scope

- Time-of-day on events (the app does not store event times)
- Editing a template retroactively updating past events
- Notifications or reminders
- Sub-weekly or non-weekly recurrence patterns
