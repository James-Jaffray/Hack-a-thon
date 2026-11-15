# CalHub

**One calendar for all your calendars.** CalHub is a shared hub: a group creates one hub, everyone adds their own Google and Apple calendars to it, and the whole group sees one merged view next to the things you reach for every day: quick links, weather, and what is happening today.

Built at the November 2026 hackathon. Theme: **Refinement**.

## Why we built it

We surveyed fellow students and developers before writing any code (full notes in [docs/research.md](docs/research.md)):

- Students mostly do not use calendars. The habit never forms, so events get forgotten.
- Many people live across ecosystems: Android phone and laptop, Apple phone, or both.
- People check their calendar 2 to 4 times a day, and mostly when they know the week is busy.
- Moving or syncing calendars between apps is painful, and devices do not always agree.

Refinement, for us, means fewer tabs and fewer steps: one page, every calendar, nothing to set up twice.

## How a hub works

1. **Create a hub.** Pick a hub name and a password. Everyone in the group logs in with the same two things.
2. **Add your calendars.** Inside the hub, each person connects their own Google or Apple calendars and labels them with their name (for example "Althea" or "Caleb").
3. **Choose what to share.** Every connection has a "Show calendar" switch, and each Google account has a per-calendar picker, so you can connect ten Google calendars and share only the four you want.
4. **See everyone.** The month view and "Events today" list merge all enabled calendars. Hover an event to see whose it is.

> The hub login is shared, so use a password you do not use anywhere else.

## Features

- Shared hubs: create a hub or log in to one, with sessions that work across devices
- Member labels: every connected calendar belongs to a named person, grouped on the dashboard
- Connect a **Google Calendar** through OAuth (read-only access)
- Connect an **Apple Calendar** by pasting its public share link (ICS)
- Choose which individual Google calendars are shared, and switch any connection on or off
- One merged month view, colour-coded by source, with recurring and all-day events handled
- "Events today" list
- Five editable shortcut buttons that follow the hub
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

Open http://localhost:3000 and log in to the demo hub:

| Hub name | Password |
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

**Updating an existing database after pulling schema changes** (keeps your data):

```
docker compose exec db psql -U postgres -d calhub -c "ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS owner_name TEXT;"
```

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
2. Connecting Google runs the OAuth flow on the server. We keep only the refresh token, and it is never sent to the browser. The owner label typed on the dashboard travels through the session and is saved with the connection when Google sends the user back.
3. `GET /api/events` loads every enabled connection in the hub in parallel, converts each calendar's events into one shared shape, tags each with its owner, sorts them, and returns them. If one calendar fails, the others still load and the failure is reported in `errors`.
4. Apple/ICS links are fetched server-side. We only accept public `https` links and block private and internal addresses.
5. Sharing is controlled at two levels: `is_enabled` switches a whole connection on or off, and `enabled_calendars` (Google only) lists exactly which of that account's calendars are shared.

**Naming note:** the hub name is stored in the `users.email` column and sent as `email` in the auth API. The field name predates the hub model, and renaming it is on the to-do list.

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
  "color": "#4285f4",
  "owner": "Althea"
}
```

- `source` is `"google"` or `"apple"`.
- `owner` is the member label of the connection the event came from.
- Timed events use ISO 8601 with an offset. All-day events use a date only (`"2026-11-16"`) and `allDay: true`.
- For all-day events `end` is exclusive: a one-day event ends on the next date.

### Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | no | `{email, password}` where `email` is the hub name (3 to 40 characters) → `201 {id, email}` (409 if the hub name is taken) |
| POST | `/api/auth/login` | no | `{email, password}` → `200 {id, email}` (401 on bad credentials) |
| GET | `/api/auth/me` | yes | → `{id, email}` |
| POST | `/api/auth/logout` | no | → `{ok: true}` |
| GET | `/auth/google?owner=Name` | yes | Browser redirect to Google consent (navigate, do not fetch). `owner` labels the calendar; it defaults to the Google account's email. |
| GET | `/auth/google/callback` | yes | Google returns here, then redirects to `/dashboard.html?google=connected` (or `denied`, `error`) |
| GET | `/api/connections` | yes | → `[{id, provider, displayName, ownerName, createdAt, isEnabled}]` (never includes credentials) |
| POST | `/api/connections/apple` | yes | `{icsUrl, displayName?, ownerName?}` → `201 {id, provider, displayName, ownerName}` (400 unreadable link, 409 already added) |
| PATCH | `/api/connections/:id` | yes | `{isEnabled?, ownerName?}` → `{id, isEnabled, ownerName}`. Switch a connection on or off, or rename its owner. |
| DELETE | `/api/connections/:id` | yes | Remove a connected calendar → `204` (404 if not found) |
| GET | `/api/connections/:id/calendars` | yes | Google only → `[{id, name, color, enabled}]`, the account's calendars and which are shared |
| PUT | `/api/connections/:id/calendars` | yes | Google only. `{enabledIds: [...]}` → `{enabledIds}`. Saves which calendars are shared; unknown ids are dropped. |
| GET | `/api/events?from=&to=` | yes | → `{events: Event[], errors: [{connectionId, provider, displayName, needsReconnect}]}`, merged and sorted by start. `from` and `to` are ISO dates and default to now through 30 days ahead. |
| GET | `/api/shortcuts` | yes | → `[{id, position, label, url}]` |
| PUT | `/api/shortcuts/:position` | yes | `{label, url}`, position 1 to 5 (label up to 40 characters, url must start with http or https), upserts |
| DELETE | `/api/shortcuts/:position` | yes | Clear a slot → `204` |

## Team

| Name | Built |
| --- | --- |
| James | Database and hubs, Google and Apple integrations, calendar picker, member labels, events API, calendar view |
| Althea | Login and signup, calendar connections page |
| Caleb | Shortcuts, weather |

## What's next

Ideas that we did not get to:

- **Personal logins inside a hub.** Today the hub has one shared login. Next step is invites, so each person has their own account in the same hub, and can leave or be removed without everyone changing a password.
- Rename the `email` column and API field to `hub_name`
- Import and export that does not break when moving calendars between apps
- Automatic labels for events, with a toggle (possibly AI-assisted)
- A toggle for the "copy the time of your last similar event" behaviour people find annoying
- Reminders 30 to 60 minutes before an event, which is when people said they want them
- Real Apple support through CalDAV instead of share links
- Public hosting with HTTPS so it works from a phone
