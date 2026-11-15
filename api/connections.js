import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { fetchIcsEvents, normalizeIcsUrl } from '../lib/ics.js';
import { listGoogleCalendars } from '../lib/google.js';

const router = Router();
router.use(requireAuth);

// GET /api/connections -> [{ id, provider, displayName, createdAt }]
// Never select `credential`: it holds refresh tokens.
router.get('/', async (req, res) => {
    const rows = await sql`
    SELECT id, provider, display_name AS "displayName", created_at AS "createdAt"
    FROM calendar_connections
    WHERE user_id = ${req.session.userId}
    ORDER BY id`;
    res.json(rows);
});

// DELETE /api/connections/:id
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad id' });

    // user_id in the WHERE means you can only delete your own
    const result = await sql`
    DELETE FROM calendar_connections
    WHERE id = ${id} AND user_id = ${req.session.userId}`;

    if (result.count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
});

// POST /api/connections/apple  body: { icsUrl, displayName }
router.post('/apple', async (req, res) => {
    const { icsUrl, displayName } = req.body ?? {};

    const url = normalizeIcsUrl(icsUrl);
    if (!url) {
        return res.status(400).json({ error: 'Enter a calendar link starting with webcal:// or https://' });
    }
    const name = typeof displayName === 'string' && displayName.trim()
        ? displayName.trim().slice(0, 60)
        : 'Apple Calendar';

    // Prove the link works by fetching one day (this also runs the safety checks)
    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        await fetchIcsEvents(url.href, now.toISOString(), tomorrow.toISOString(), name);
    } catch (err) {
        console.warn('ICS validation failed:', err.message);
        return res.status(400).json({ error: "Couldn't read a calendar from that link" });
    }

    const [row] = await sql`
    INSERT INTO calendar_connections (user_id, provider, credential, display_name)
    VALUES (${req.session.userId}, 'apple', ${url.href}, ${name})
    ON CONFLICT (user_id, provider, credential) DO NOTHING
    RETURNING id, provider, display_name AS "displayName"`;

    if (!row) return res.status(409).json({ error: 'That calendar is already connected' });
    res.status(201).json(row);
});

// Load a Google connection that belongs to this user, or send the error and return null
async function loadGoogleConnection(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Bad id' });
        return null;
    }
    const [row] = await sql`
    SELECT id, credential, enabled_calendars
    FROM calendar_connections
    WHERE id = ${id} AND user_id = ${req.session.userId} AND provider = 'google'`;
    if (!row) {
        res.status(404).json({ error: 'Not found' });
        return null;
    }
    return row;
}

// GET /api/connections/:id/calendars -> [{ id, name, color, enabled }]
router.get('/:id/calendars', async (req, res) => {
    const row = await loadGoogleConnection(req, res);
    if (!row) return;
    try {
        res.json(await listGoogleCalendars(row.credential, row.enabled_calendars));
    } catch (err) {
        console.warn('Listing calendars failed:', err.message);
        res.status(502).json({
            error: "Couldn't load calendars",
            needsReconnect: Boolean(err.needsReconnect),
        });
    }
});

// PUT /api/connections/:id/calendars  body: { enabledIds: ["...", "..."] }
router.put('/:id/calendars', async (req, res) => {
    const row = await loadGoogleConnection(req, res);
    if (!row) return;

    const { enabledIds } = req.body ?? {};
    if (!Array.isArray(enabledIds) || enabledIds.length > 200
        || !enabledIds.every((x) => typeof x === 'string')) {
        return res.status(400).json({ error: 'enabledIds must be a list of calendar ids' });
    }

    try {
        // Keep only ids that really exist on this Google account
        const real = await listGoogleCalendars(row.credential);
        const valid = new Set(real.map((c) => c.id));
        const clean = enabledIds.filter((x) => valid.has(x));

        await sql`
        UPDATE calendar_connections
        SET enabled_calendars = ${sql.json(clean)}
        WHERE id = ${row.id}`;

        res.json({ enabledIds: clean });
    } catch (err) {
        console.warn('Saving calendars failed:', err.message);
        res.status(502).json({
            error: "Couldn't save calendars",
            needsReconnect: Boolean(err.needsReconnect),
        });
    }
});


export default router;