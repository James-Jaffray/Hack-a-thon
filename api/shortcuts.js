import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// Every route in this file requires a logged-in user
router.use(requireAuth);

// GET /api/shortcuts -> [{ id, position, label, url }]
router.get('/', async (req, res) => {
    const rows = await sql`
    SELECT id, position, label, url
    FROM shortcuts
    WHERE user_id = ${req.session.userId}
    ORDER BY position`;
    res.json(rows);
});

// PUT /api/shortcuts/:position  body: { label, url }
router.put('/:position', async (req, res) => {
    const position = Number(req.params.position);
    if (!Number.isInteger(position) || position < 1 || position > 5) {
        return res.status(400).json({ error: 'Position must be 1-5' });
    }

    const { label, url } = req.body ?? {};
    const cleanLabel = typeof label === 'string' ? label.trim() : '';
    const cleanUrl = typeof url === 'string' ? url.trim() : '';

    if (!cleanLabel || cleanLabel.length > 40) {
        return res.status(400).json({ error: 'Label is required (max 40 characters)' });
    }
    // Blocks javascript: and other non-web schemes
    if (!/^https?:\/\//i.test(cleanUrl)) {
        return res.status(400).json({ error: 'URL must start with http:// or https://' });
    }

    const [row] = await sql`
    INSERT INTO shortcuts (user_id, position, label, url)
    VALUES (${req.session.userId}, ${position}, ${cleanLabel}, ${cleanUrl})
    ON CONFLICT (user_id, position)
    DO UPDATE SET label = EXCLUDED.label, url = EXCLUDED.url
    RETURNING id, position, label, url`;

    res.json(row);
});

// DELETE /api/shortcuts/:position
router.delete('/:position', async (req, res) => {
    const position = Number(req.params.position);
    if (!Number.isInteger(position) || position < 1 || position > 5) {
        return res.status(400).json({ error: 'Position must be 1-5' });
    }

    // user_id in the WHERE clause means you can only delete your own
    await sql`
    DELETE FROM shortcuts
    WHERE user_id = ${req.session.userId} AND position = ${position}`;

    res.status(204).end();
});

export default router;