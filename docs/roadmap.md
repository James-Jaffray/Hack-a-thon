# Calendar Hub: Hackathon Roadmap

Built for 3 novice devs. Everything is ordered so you have a working demo as early as possible, then add on top. If you run out of time, cut from the bottom, never the top.

**Suggested workstreams** (adjust to who's strongest at what):
- **A: Backend + Persistence**: database, accounts, sessions, hosting
- **B: Integrations**: Google OAuth, ICS/Apple, event parsing
- **C: Frontend**: calendar UI, connect buttons, merged view

---

## Phase 0: Setup (all three, ~1 hr)
- [ ] Decide the stack and write it down (suggestion: PHP + SQLite + vanilla JS, since it's the simplest to host and debug)
- [ ] Create one shared Git repo; agree on folder layout (`/public`, `/api`, `/lib`, `/db`)
- [ ] Everyone gets the project running locally
- [ ] Agree on the **event shape** every calendar converts into (this is the contract between B and C):
  `{ id, title, start, end, allDay, source ("google" | "apple"), calendarName, color }`
- [ ] Agree on API endpoints C will call, e.g. `GET /api/events?from=&to=`, `GET /api/connections`
- [ ] Pick a hosting plan early (needs public HTTPS, see Phase 5)

**Done when:** a "hello world" page loads from the shared repo on all 3 machines.

---

## Phase 1: Accounts + Database (A leads; this is the persistence piece)
- [ ] Create SQLite DB with tables: `users`, `calendar_connections` (user_id, provider, token/credentials/ICS URL, created_at)
- [ ] Signup endpoint (`password_hash()`)
- [ ] Login/logout endpoints (`password_verify()`, PHP sessions)
- [ ] A "who am I" endpoint so the frontend knows if you're logged in
- [ ] Protect API routes: no session, no data

**Done when:** you can sign up on one browser, log in on a different device, and see the same account.

---

## Phase 2: Frontend skeleton (C, parallel with Phase 1)
- [ ] Login/signup pages
- [ ] Main hub page with a month or week view
- [ ] Render events from **fake hardcoded data** in the agreed event shape (don't wait on the backend)
- [ ] "Connect Google" and "Add Apple/ICS calendar" buttons (not wired up yet)
- [ ] Per-calendar color coding

**Done when:** the UI looks like a calendar with fake events and can switch views.

---

## Phase 3: Google Calendar (B leads, A helps with token storage)
- [ ] Google Cloud project, enable Calendar API, create OAuth client, set redirect URI
- [ ] Consent screen in **Testing** mode and add all teammates + judges' demo account as test users
- [ ] `/auth/google` sends the user to Google (`access_type=offline`, `calendar.readonly`)
- [ ] `/auth/google/callback` exchanges the code for tokens, saves the refresh token in `calendar_connections`
- [ ] Function to get a fresh access token from the refresh token
- [ ] Fetch the calendar list, then events (`singleEvents=true`, `timeMin`/`timeMax`)
- [ ] Convert Google events into the shared event shape

**Done when:** a real Google calendar's events show up in the hub.

---

## Phase 4: Apple Calendar via ICS link (B)
- [ ] Form where the user pastes a public calendar link (`webcal://` swapped to `https://`)
- [ ] Server fetches the ICS and parses it (find a PHP ICS parsing library rather than hand-rolling it)
- [ ] Handle all-day events and timezones (expect some pain here)
- [ ] Recurring events: use the library's expansion, or decide to show only the next N occurrences
- [ ] Convert into the shared event shape and save the URL in `calendar_connections`

**Done when:** an Apple calendar and a Google calendar show side by side in one view.

---

## Phase 5: Hosting + cross-device (A)
- [ ] Deploy to a public HTTPS URL (home server with a tunnel, or a cheap host)
- [ ] Add the production redirect URI in Google Cloud
- [ ] Test the full flow from a phone and a second computer

**Done when:** log in on a phone, see the same connected calendars with no re-setup.

---

## Phase 6: Merge + Polish (all three)
- [ ] Merged view of all connected calendars, with toggle filters per calendar
- [ ] Disconnect / remove a calendar
- [ ] Loading states and friendly errors (token expired, bad ICS link, network failure)
- [ ] Caching so you're not hitting Google on every page load
- [ ] Mobile-friendly layout

---

## Stretch (only if everything above works)
- [ ] Real Apple support via CalDAV + app-specific password (encrypt stored credentials)
- [ ] "Find a free time" across calendars
- [ ] Create events from the hub (needs write scope)
- [ ] Share a read-only hub link

---

## Final 2 hours before demo
- [ ] Freeze features, bug fixes only
- [ ] Seed a demo account with good-looking sample calendars
- [ ] Rehearse the demo path end to end, including on the demo device and network
- [ ] Have a backup: screen recording of a working run
- [ ] Prepare a 2-minute pitch covering the problem, the demo and the "refinement" angle

---

## Known risks
| Risk | Mitigation |
|---|---|
| Google refresh tokens expire after 7 days in Testing mode | Fine for a demo; re-auth the demo account the day before |
| OAuth redirect URI mismatch | Exact-match string; add localhost *and* prod URIs |
| ICS timezone and recurrence bugs | Use a library; test with a recurring event early |
| Merge conflicts on 3 novice devs | Small commits, separate files per workstream, pull before you push |
| Secrets committed to Git | Put client secret in a `.env`, add it to `.gitignore` before the first commit |
| Hosting gets left to the last hour | Do Phase 5 as soon as Phase 3 works, not at the end |
