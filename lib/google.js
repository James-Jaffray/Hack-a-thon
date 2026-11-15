const cache = new Map(); // refreshToken -> { token, expiresAt }

export async function getAccessToken(refreshToken) {
    // Reuse a token we fetched recently
    const hit = cache.get(refreshToken);
    if (hit && hit.expiresAt > Date.now()) return hit.token;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(`Google token refresh failed: ${body.error ?? res.status}`);
        // invalid_grant = token expired or revoked -> user must reconnect
        err.needsReconnect = body.error === 'invalid_grant';
        throw err;
    }

    const data = await res.json();
    cache.set(refreshToken, {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s safety margin
    });
    return data.access_token;
}

const API = 'https://www.googleapis.com/calendar/v3';

function toEvent(ev, cal) {
    return {
        id: `google:${cal.id}:${ev.id}`,
        title: ev.summary ?? '(No title)',
        start: ev.start.dateTime ?? ev.start.date, // timed events have dateTime, all-day have date
        end: ev.end.dateTime ?? ev.end.date,
        allDay: Boolean(ev.start.date),
        source: 'google',
        calendarName: cal.summary,
        color: cal.backgroundColor,
    };
}

// from / to are ISO strings, e.g. new Date().toISOString()
export async function fetchGoogleEvents(refreshToken, from, to, enabledIds = null) {
    const token = await getAccessToken(refreshToken);
    const headers = { Authorization: `Bearer ${token}` };

     // 1. Which calendars does this account have?
    const all = await listCalendars(token);
    const calendars = enabledIds
        ? all.filter(c => enabledIds.includes(c.id))
        : all.filter(c => c.selected);

    // 2. Events from each calendar, in parallel
    const perCalendar = await Promise.all(calendars.map(async (cal) => {
        const params = new URLSearchParams({
            timeMin: from,
            timeMax: to,
            singleEvents: 'true',   // expands recurring events into individual instances
            orderBy: 'startTime',
            maxResults: '250',
        });
        const res = await fetch(`${API}/calendars/${encodeURIComponent(cal.id)}/events?${params}`, { headers });
        if (!res.ok) {
            console.warn(`Skipping calendar "${cal.summary}": ${res.status}`);
            return []; // one bad calendar shouldn't break the rest
        }
        const data = await res.json();
        return data.items
            .filter(ev => ev.status !== 'cancelled')
            .map(ev => toEvent(ev, cal));
    }));

    // 3. Flatten into one list, sorted by start
    return perCalendar.flat().sort((a, b) => a.start.localeCompare(b.start));
}

async function listCalendars(token) {
    const res = await fetch(`${API}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Calendar list failed: ${res.status}`);
    return (await res.json()).items;
}

// For the on/off UI. enabledIds = null means "use Google's own checked calendars"
export async function listGoogleCalendars(refreshToken, enabledIds = null) {
    const token = await getAccessToken(refreshToken);
    const items = await listCalendars(token);
    return items.map(c => ({
        id: c.id,
        name: c.summaryOverride ?? c.summary,
        color: c.backgroundColor,
        enabled: enabledIds ? enabledIds.includes(c.id) : Boolean(c.selected),
    }));
}