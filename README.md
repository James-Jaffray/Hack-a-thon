# CalHub

**One calendar for all your calendars.** CalHub pulls your Google and Apple calendars into a single page, next to the things you reach for every day: quick links, weather, and what is happening today.

Built at the November 2026 hackathon. Theme: **Refinement**.

## Why we built it

We surveyed fellow students and developers before writing any code (full notes in [docs/research.md](docs/research.md)):

- Students mostly do not use calendars. The habit never forms, so events get forgotten.
- Many people live across ecosystems: Android phone and laptop, Apple phone, or both.
- People check their calendar 2 to 4 times a day, and mostly when they know the week is busy.
- Moving or syncing calendars between apps is painful, and devices do not always agree.

Refinement, for us, means fewer tabs and fewer steps: one page, every calendar, nothing to set up twice.

## Features

- Accounts: sign up and log in, with sessions that work across devices
- Connect a **Google Calendar** through OAuth (read-only access)
- Connect an **Apple Calendar** by pasting its public share link (ICS)
- One merged month view, colour-coded by source, with recurring and all-day events handled
- "Events today" list
- Five editable shortcut buttons that follow your account
- Weather for Edmonton
- Disconnect a calendar at any time

## Quick start

You need Docker Desktop. Node and pnpm are only needed for the faster dev loop below.

```
git clone https://github.com/James-Jaffray/Hack-a-thon.git
cd Hack-a-thon
copy .env.example .env        # macOS/Linux: cp .env.example .env
docker compose up -d --build
```

Open http://localhost:3000 and log in with the demo account:

| Email | Password |
| --- | --- |
| `demo@calhub.test` | `demo1234` |

Google sign-in needs real credentials in `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Without them everything else still works, and Apple calendars can be connected with any public `.ics` link.

**Faster loop while coding**

```
docker compose up -d db       # just the database (port 5433)
pnpm install
pnpm dev                      # server restarts on every save; refresh the browser to see changes
```

**Reset the database to the seed data:** `docker compose down -v`, then `docker compose up -d --build`.

## Tech stack

| Layer | Choice |
| --- | --- |
| Server | Node.js, Express 5 |
| Database | PostgreSQL 16 (Docker Compose) |
| Auth | bcrypt password hashes, signed cookie sessions |
| Calendars | Google Calendar API (OAuth 2.0), `node-ical` for ICS feeds |
| Frontend | Plain HTML, CSS and ES modules, no bundler |

```
api/        Express routers: auth, events, connections, shortcuts, Google OAuth
lib/        Calendar fetching and normalizing (google.js, ics.js)
db/         schema.sql and seed.sql
public/     The website: pages, js/, css/
docs/       Research notes
```

## How it works

1. The browser only talks to our Express app (same origin, session cookie).
2. Connecting Google runs the OAuth flow on the server. We keep only the refresh token, and it is never sent to the browser.
3. `GET /api/events` loads every connection for the user in parallel, converts each calendar's events into one shared shape, sorts them, and returns them. If one calendar fails, the others still load and the failure is reported in `errors`.
4. Apple/ICS links are fetched server-side. We only accept public `https` links and block private and internal addresses.

## API reference

Base URL is the same origin as the site (`http://localhost:3000` in dev). All bodies are JSON. Auth is a signed session cookie set by login or signup; the browser sends it automatically. Routes marked "auth" return `401` without a session. Errors are `{ "error": "message" }`.

### Event shape (used everywhere)

```json
{
  "id": "google:abc123",
  "title": "CMPP 2000 Lecture",
  "start": "2026-11-16T09:00:00-07:00",
  "end": "2026-11-16T10:30:00-07:00",
  "allDay": false,
  "source": "google",
  "calendarName": "School",
  "color": "#4285f4"
}
```

- `source` is `"google"` or `"apple"`.
- Timed events use ISO 8601 with an offset. All-day events use a date only (`"2026-11-16"`) and `allDay: true`.
- For all-day events `end` is exclusive: a one-day event ends on the next date.

### Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | no | `{email, password}` → `201 {id, email}` (409 if the email is taken) |
| POST | `/api/auth/login` | no | `{email, password}` → `200 {id, email}` (401 on bad credentials) |
| GET | `/api/auth/me` | yes | → `{id, email}` |
| POST | `/api/auth/logout` | no | → `{ok: true}` |
| GET | `/auth/google` | yes | Browser redirect to Google consent (navigate, do not fetch) |
| GET | `/auth/google/callback` | yes | Google returns here, then redirects to `/dashboard.html?google=connected` (or `denied`, `error`) |
| GET | `/api/connections` | yes | → `[{id, provider, displayName, createdAt}]` (never includes credentials) |
| POST | `/api/connections/apple` | yes | `{icsUrl, displayName?}` → `201 {id, provider, displayName}` (400 unreadable link, 409 already added) |
| DELETE | `/api/connections/:id` | yes | Remove a connected calendar → `204` (404 if not found) |
| GET | `/api/events?from=&to=` | yes | → `{events: Event[], errors: [{connectionId, provider, displayName, needsReconnect}]}`, merged and sorted by start. `from` and `to` are ISO dates and default to now through 30 days ahead. |
| GET | `/api/shortcuts` | yes | → `[{id, position, label, url}]` |
| PUT | `/api/shortcuts/:position` | yes | `{label, url}`, position 1 to 5 (label up to 40 characters, url must start with http or https), upserts |
| DELETE | `/api/shortcuts/:position` | yes | Clear a slot → `204` |

## Team

| Name | Built |
| --- | --- |
| James | Database and accounts, Google and Apple integrations, events API, calendar view |
| Althea | Login and signup, calendar connections page |
| Caleb | Shortcuts, weather |

## What's next

Ideas from our research that we did not get to:

- Import and export that does not break when moving calendars between apps
- Automatic labels for events, with a toggle (possibly AI-assisted)
- A toggle for the "copy the time of your last similar event" behaviour people find annoying
- Reminders 30 to 60 minutes before an event, which is when people said they want them
- Real Apple support through CalDAV instead of share links
- Public hosting with HTTPS so it works from a phone
