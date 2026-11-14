# Hack-a-thon
Nov 2026 - Hack-a-thon

# Do People Use Calendars
- Corporate, working - majority says "YES"
- Students - majority say "NO"
    - Why? People forget, no habit formed

## What Avenue is Used
- Mainly android (for sdevs)
- Lots use both - android on laptops/desktops, then apple phones
- 1 physical 

## How Many Times is it Checked in a Day
- between 0-10x
    - average - 2-4x
    - depends on if they know if they've got a busy week

## Notifications
- People prefer to turn on notifications, but don't want to be overwhelmed by it
    - 30mins-1hr before an event starts, they like to get notified

# Questions to Think About
- who is our target audience?
- if people are enjoying they're google calendars, why would they want to switch over to us?

# Things to Implement
## Pain Points With People's Current Calendar Experience
- export, import - not easy to do this for calendars when your trying to integrate it into a different app
- labels - maybe use AI to automatically "tag" or categorize the event you input [create a toggle]
- when inputting an event, it automatically puts the same time as ur last similar event - they find that annoying [create a toggle]
- it's hard to find dates sometimes
- annoying to check different devices because sometimes they don't sync






## API Contract

Base URL: same origin as the site (`http://localhost:3000` in dev). All bodies are JSON.
Auth is a signed session cookie set by login/signup. The browser sends it automatically,
so use `fetch(url, { credentials: 'same-origin' })` and never handle tokens in the frontend.
Any route marked "auth" returns `401 { "error": "Not logged in" }` without a session.

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
- Timed events use ISO 8601 with offset. All-day events use a date only (`"2026-11-16"`) and `allDay: true`.

### Endpoints

| Method | Path | Auth | Status | Purpose |
|---|---|---|---|---|
| POST | /api/auth/signup | no | built | `{email, password}` → `201 {id, email}` (409 if email taken) |
| POST | /api/auth/login | no | built | `{email, password}` → `200 {id, email}` (401 on bad creds) |
| GET | /api/auth/me | yes | built | → `{id, email}` |
| POST | /api/auth/logout | no | built | → `{ok: true}` |
| GET | /auth/google | yes | planned | Browser redirect to Google consent (navigate, don't fetch) |
| GET | /auth/google/callback | yes | planned | Google returns here, then redirects to `/dashboard.html` |
| GET | /api/connections | yes | planned | → `[{id, provider, displayName}]` (never includes credentials) |
| POST | /api/connections/apple | yes | planned | `{icsUrl, displayName}` → `201 {id}` |
| DELETE | /api/connections/:id | yes | planned | Remove a connected calendar |
| GET | /api/events?from=&to= | yes | planned | → `Event[]`, merged across all connections, sorted by start |
| GET | /api/shortcuts | yes | planned | → `[{id, position, label, url}]` |
| PUT | /api/shortcuts/:position | yes | planned | `{label, url}`, position 1–5, upserts |
| DELETE | /api/shortcuts/:position | yes | planned | Clear a slot |

### Errors

Every error is `{ "error": "message" }` with a normal status code (400, 401, 404, 409, 500).

### Mock data

Until `/api/events` is live, the frontend can render from a hardcoded array in the shape above.