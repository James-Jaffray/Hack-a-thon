import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { fetchGoogleEvents } from '../lib/google.js';

const router = Router();
router.use(requireAuth);

const DAY = 24 * 60 * 60 * 1000;

// GET /api/events?from=ISO&to=ISO  (defaults: now -> 30 days out)
router.get('/', async (req, res) => {
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 30 * DAY);
    if (isNaN(from) || isNaN(to) || from >= to) {
        return res.status(400).json({ error: 'Invalid from/to' });
    }

    const connections = await sql`
    SELECT id, provider, credential, display_name
    FROM calendar_connections
    WHERE user_id = ${req.session.userId}`;

    // allSettled: one broken connection must not take down the others
    const results = await Promise.allSettled(connections.map((c) => {
        if (c.provider === 'google') {
            return fetchGoogleEvents(c.credential, from.toISOString(), to.toISOString());
        }
        return Promise.resolve([]); // apple/ICS comes later
    }));

    const events = [];
    const errors = [];
    results.forEach((r, i) => {
        const c = connections[i];
        if (r.status === 'fulfilled') {
            events.push(...r.value);
        } else {
            console.warn(`Connection ${c.id} (${c.provider}) failed:`, r.reason.message);
            errors.push({
                connectionId: c.id,
                provider: c.provider,
                displayName: c.display_name,
                needsReconnect: Boolean(r.reason.needsReconnect),
            });
        }
    });

    events.sort((a, b) => a.start.localeCompare(b.start));
    res.json({ events, errors });
});

export default router;