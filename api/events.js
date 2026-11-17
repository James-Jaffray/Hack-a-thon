import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, requireActiveHub } from '../lib/auth.js';
import { fetchGoogleEvents } from '../lib/google.js';
import { fetchIcsEvents } from '../lib/ics.js';

const router = Router();
router.use(requireAuth, requireActiveHub);

const DAY = 24 * 60 * 60 * 1000;

// GET /api/events?from=ISO&to=ISO  (defaults: now -> 30 days out)
router.get('/', async (req, res) => {
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 30 * DAY);
    if (isNaN(from) || isNaN(to) || from >= to) {
        return res.status(400).json({ error: 'Invalid from/to' });
    }

    const connections = await sql`
    SELECT id, provider, credential, display_name, owner_name, enabled_calendars, is_enabled
    FROM calendar_connections
    WHERE hub_id = ${req.session.hubId}`;

    // allSettled: one broken connection must not take down the others
    const results = await Promise.allSettled(connections.map((c) => {
        if (!c.is_enabled) {
            return Promise.resolve([]);
        }
        if (c.provider === 'google') {
            return fetchGoogleEvents(c.credential, from.toISOString(), to.toISOString(), c.enabled_calendars);
        }
        if (c.provider === 'apple') {
            return fetchIcsEvents(c.credential, from.toISOString(), to.toISOString(), c.display_name);
        }
        return Promise.resolve([]); // unknown provider
    }));

    const events = [];
    const errors = [];
    results.forEach((r, i) => {
        const c = connections[i];
        if (r.status === 'fulfilled') {
            const owner = c.owner_name || c.display_name;
            events.push(...r.value.map((e) => ({ ...e, owner })));
        } else {
            console.warn(`Connection ${c.id} (${c.provider}) failed:`, r.reason.message);
            errors.push({
                connectionId: c.id,
                provider: c.provider,
                displayName: c.owner_name || c.display_name,   // not display_name: for Google that's an email
                ownerName: c.owner_name,
                needsReconnect: Boolean(r.reason.needsReconnect),
            });
        }
    });

    events.sort((a, b) => new Date(a.start) - new Date(b.start));
    res.json({ events, errors });
});

export default router;