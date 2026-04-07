# Vintage Club Pickleball — Improvement Ideas

Generated 2026-04-07 from codebase review + research into pickleball/club management apps.

---

## High Value, Relatively Easy

- [ ] **RSVP / check-in before the round** — a "I'm coming today" button (or shareable link) so players self-register attendance before the session, eliminating manual checkbox work at the start of each event.

- [ ] **Recurring events** — if Tuesday morning is always "Vintage Club choose-up", an organizer shouldn't have to create a new event every week. A template or "create next occurrence" button would save time.

- [ ] **Per-player stats page** — total games played, wins, win rate, events attended. Already logging all court results; just needs a view.

- [ ] **King of the Court rotation format** — winners stay, losers cycle off, next players come from a queue. River mode is close; the missing piece is a player queue rather than the losing team from another court.

- [ ] **TV / display mode** — full-screen read-only view of court assignments designed to be shown on a TV or monitor visible to all players at the club.

---

## Medium Value, More Involved

- [ ] **Cross-event leaderboard** — season view showing wins and participation across multiple events. Currently only per-event stats exist.

- [ ] **Session notes / announcements** — a simple text field on an event or round (e.g., "Court 3 net is broken") visible to all viewers.

- [ ] **Holding Pen rotation priority** — automatically track who sat out last round and prioritize them for court assignment next round.

- [ ] **DUPR color-coded skill badges** — color-code player ratings by level on court cards and the participant list (e.g., green = 3.5+, yellow = 2.5–3.5, gray = unrated) for quick visual skill distribution check.

---

## Lower Priority / Nice to Have

- [ ] **Email or SMS reminders** — "Tuesday's session is tomorrow at 9am" automated to participants. Requires adding contact info to player profiles and integrating an email/SMS service (Resend, Twilio, etc.).

- [ ] **Export / sharing** — share court assignments as a simple image or copy-paste text for posting to a group chat.

- [ ] **PWA / home screen install** — add a web app manifest and service worker so players can install the app to their phone home screen and have it behave like a native app.

- [ ] **Skill-matched AI pairings** — use DUPR ratings to generate maximally balanced teams rather than just sorting by rank.

- [ ] **Digital waivers** — collect a one-time liability waiver at player registration.

- [ ] **Matchmaking / player finder** — find other members at your level for casual games outside organized events.
