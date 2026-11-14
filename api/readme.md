## Event shape (every calendar converts into this)
{ id, title, start, end, allDay, source: "google" | "apple", calendarName, color }
- start/end: ISO 8601 strings ("2026-11-20T14:00:00-07:00"); for allDay events, date-only ("2026-11-20")

## Endpoints (all return JSON; errors are { error: "message" })
Auth (done)
- POST /api/auth/signup | /login | /logout     GET /api/auth/me
Connections (login required; NEVER return the credential column)
- GET    /api/connections            -> [{ id, provider, displayName }]
- POST   /api/connections/ics        body { url, displayName }
- DELETE /api/connections/:id
- GET    /auth/google                -> redirects to Google    GET /auth/google/callback
Events
- GET /api/events?from=ISO&to=ISO    -> [event, ...] merged from all connections
Shortcuts (login required, positions 1-5)
- GET    /api/shortcuts              -> [{ position, label, url }]
- PUT    /api/shortcuts/:position    body { label, url }   (add or edit)
- DELETE /api/shortcuts/:position