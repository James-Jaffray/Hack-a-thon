import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, requireActiveHub, requireMember } from '../lib/auth.js';
import { fetchIcsEvents, normalizeIcsUrl } from '../lib/ics.js';
import { listGoogleCalendars } from '../lib/google.js';

const router = Router();
router.use(requireAuth, requireActiveHub);

// GET /api/connections -> [{ id, provider, displayName, ownerName, createdAt, isEnabled, canEdit }]
// canEdit = it's yours. Other people's displayName is hidden (for Google it's their email address).
// Never select `credential`: it holds refresh tokens.
router.get('/', async (req, res) => {
    const rows = await sql`
    SELECT
        id,
        provider,
        CASE WHEN member_id = ${req.member.id} THEN display_name END AS "displayName",
        COALESCE(member_id = ${req.member.id}, false) AS "canEdit",
        owner_name AS "ownerName",
        created_at AS "createdAt",
        is_enabled AS "isEnabled"
    FROM calendar_connections
    WHERE hub_id = ${req.session.hubId}
    ORDER BY id`;

    res.json(rows);
});

// PATCH /api/connections/:id  body: { isEnabled }
router.patch('/:id', requireMember, async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Bad id' });
    }

    const { isEnabled } = req.body ?? {};

    if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({ error: 'isEnabled must be true or false' });
    }

    const [row] = await sql`
        UPDATE calendar_connections
        SET is_enabled = ${isEnabled}
        WHERE id = ${id}
        AND hub_id = ${req.session.hubId}
        AND member_id = ${req.member.id}
        RETURNING id, is_enabled AS "isEnabled", owner_name AS "ownerName"
    `;

    if (!row) {
        return res.status(404).json({ error: 'Not found' });
    }

    res.json(row);
});

// DELETE /api/connections/:id
// Anyone in the hub may remove a calendar: removing only ever shares less.
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad id' });

    // hub_id in the WHERE means you can only delete from your own hub
    const result = await sql`
    DELETE FROM calendar_connections
    WHERE id = ${id} AND hub_id = ${req.session.hubId}`;

    if (result.count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
});

// POST /api/connections/apple  body: { icsUrl, displayName }
router.post('/apple', requireMember, async (req, res) => {
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
    INSERT INTO calendar_connections (hub_id, member_id, provider, credential, display_name, owner_name)
    VALUES (${req.session.hubId}, ${req.member.id}, 'apple', ${url.href}, ${name}, ${req.member.name})
    ON CONFLICT (hub_id, provider, credential) DO NOTHING
    RETURNING id, provider, display_name AS "displayName", owner_name AS "ownerName"`;

    if (!row) return res.status(409).json({ error: 'That calendar is already connected' });
    res.status(201).json(row);
});

// Load a Google connection that belongs to this member, or send the error and return null
async function loadGoogleConnection(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Bad id' });
        return null;
    }
    const [row] = await sql`
    SELECT id, credential, enabled_calendars
    FROM calendar_connections
    WHERE id = ${id} AND hub_id = ${req.session.hubId} AND member_id = ${req.member.id}
        AND provider = 'google'`;
    if (!row) {
        res.status(404).json({ error: 'Not found' });
        return null;
    }
    return row;
}

// GET /api/connections/:id/calendars -> [{ id, name, color, enabled }]
router.get('/:id/calendars', requireMember, async (req, res) => {
    try {
        const row = await loadGoogleConnection(req, res);
        if (!row) return;

        const calendars = await listGoogleCalendars(
            row.credential,
            row.enabled_calendars
        );

        res.json(calendars);

    } catch (err) {
        console.error('Google calendar loading error:', err);

        res.status(500).json({
            error: err.message,
            needsReconnect: Boolean(err.needsReconnect)
        });
    }
});

// PUT /api/connections/:id/calendars  body: { enabledIds: ["...", "..."] }
router.put('/:id/calendars', requireMember, async (req, res) => {
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