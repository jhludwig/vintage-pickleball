# Vintage Club Pickleball — Design Spec
**Date:** 2026-04-01

## Overview

A web app for managing Vintage Club pickleball events. Club pros log in to manage players and run "choose-up" events with algorithmic court assignments. Anyone with the URL can view data; only authenticated pros can make changes.

**Stack:** React + Vite · Supabase (PostgreSQL + Auth) · Tailwind CSS · React Router · GitHub Pages (deployed via GitHub Actions)

---

## Navigation

Bottom tab bar with two tabs:
- **Players** — manage the player roster
- **Events** — manage events and rounds

A branding image is planned behind the top title element (deferred to later).

---

## Auth

- Supabase email + password auth, individual accounts per pro
- Pro accounts created via Supabase admin dashboard (no self-signup)
- Unauthenticated users can view all data (read-only)
- All create/edit/delete operations require an authenticated pro session
- Enforced via Supabase Row Level Security (RLS) policies
- Login page at `/login`; app redirects there if no active session
- Logout button in the app header

---

## Data Model

### `players`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| gender | text | e.g. `'M'`, `'F'`, `'Other'` |
| ranking | text | Free text; DUPR-style floats assumed for sorting (e.g. `3.5`, `4.0`) |
| player_type | text | `'pro'`, `'member'`, or `'guest'` |
| plays_pickleball | boolean | Whether this person participates |
| created_at | timestamptz | |

### `events`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | Default: `"Chooseup"` |
| date | date | Default: today |
| created_at | timestamptz | |

### `rounds`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| event_id | uuid (FK → events) | |
| round_number | integer | |
| is_committed | boolean | Default: false |
| created_at | timestamptz | |

### `round_participants`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| round_id | uuid (FK → rounds) | |
| player_id | uuid (FK → players) | |

### `active_courts`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| round_id | uuid (FK → rounds) | |
| court_number | integer | 1–8 |
| is_active | boolean | Default: false |

8 rows created per round, one per court.

### `court_assignments`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| round_id | uuid (FK → rounds) | |
| court_number | integer | 1–8 |
| player_id | uuid (FK → players) | |
| team | integer | 1 or 2 |

### `court_results`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| round_id | uuid (FK → rounds) | |
| court_number | integer | 1–8 |
| winning_team | integer | 1 or 2 |

---

## Routes

| Path | View |
|---|---|
| `/login` | Login page |
| `/players` | Players tab (default) |
| `/events` | Events list tab |
| `/events/:id` | Event detail + rounds list |
| `/events/:id/rounds/:roundId` | Round detail (court assignment view) |

---

## Players Tab

Sortable table of all players. Columns: Name, Type (pro/member/guest), Gender, Ranking, Active (plays_pickleball). Sortable by any column. Ranking sorts numerically (parsed as float; non-numeric values sort last).

- **Add player**: "Add Player" button opens a modal form (Name, Type, Gender, Ranking, Active checkbox). Saves on confirm.
- **Edit player**: Tapping a row opens the same modal pre-filled.
- **Delete player**: Delete button in the modal, with confirmation.
- Guests can be added and removed freely. Members and pros can also be added/removed.

---

## Events Tab

Chronological list of events showing date and name. Each row is tappable to open the Event detail.

- **Add event**: Modal pre-filled with today's date and name "Chooseup". Both fields editable.
- **Delete event**: Delete button on each row, with confirmation.

### Event Detail

Shows event name and date. Lists rounds (Round 1, Round 2, …) with status indicator: draft / committed / committed + results.

- **Add round**: Appends the next round number.
- **Delete round**: With confirmation.
- Tapping a round opens the Round detail view.

---

## Round Detail

### Layout

- **Top bar** (left to right): `Suggest` button · algorithm checkboxes (centered) · vertical separator · `Commit Round` button
- **Left panel**: Participant checklist — all `plays_pickleball` players, each with a checkbox to include in this round. Pros are listed but excluded from algorithm assignment (they can be manually added to courts).
- **Right panel**: Court grid — 8 courts, each with an Active checkbox, Team A column, and Team B column.

### Algorithm Checkboxes

All checkboxes are independent and combinable. When multiple are checked, priorities are applied in sequence.

| Checkbox | Behavior |
|---|---|
| Member Priority | Fill courts with members before guests. Pros excluded from algorithm. |
| Gender Priority | Assign each court to one gender where possible; overflow fills remaining spots. |
| Rank Priority | Sort by ranking (float), assign best-ranked players to Court 1 descending. |
| Social Priority | Build co-play matrix from committed rounds in the **current event only**. Minimize repeat pairings. |
| Mixed Priority | Divide courts into top (1–3), mid (4–6), bottom (7–8) tiers by rank. Shuffle randomly within each tier. |
| River Mode | Requires prior committed round with results. Winners move up one court and split teams; losers move down and split. Court 1 winners stay; lowest court losers stay. |

### Suggest Flow

1. Click **Suggest** → algorithm runs client-side, produces draft court assignments.
2. Assignments are displayed but not saved to the database yet.
3. Manual adjustments:
   - **Swap**: Tap any assigned player → "swap with..." picker listing all other assigned players.
   - **Move to other team**: Tap a player within a court → button to move them to the other team on the same court.
4. Click **Suggest** again → discards current draft and generates a new one with same settings.
5. Click **Commit Round** → assignments are saved to `court_assignments`, round `is_committed` set to true. Winners can be noted afterward via the round detail view.

---

## Deployment

- GitHub Actions workflow triggers on push to `main`
- Runs `vite build`, deploys `dist/` to GitHub Pages
- Supabase URL and anon key stored as GitHub repository secrets, injected as Vite env vars at build time
- `.superpowers/` added to `.gitignore`
