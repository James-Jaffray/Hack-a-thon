import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, requireActiveHub } from '../lib/auth.js';

const router = Router();

// Every route in this file requires a logged-in user and an active hub
router.use(requireAuth, requireActiveHub);

// Which set of shortcuts is this request about, and may it change them?
// - Hub in 'shared' mode: everyone gets the hub's set (member_id NULL); only the owner edits it.
// - Hub in 'personal' mode: a signed-in member gets their own set, which only they see and edit.
//   Someone who hasn't chosen a display name yet still sees the hub's shared set.
async function loadScope(req) {
    const [hub] = await sql`SELECT shortcut_mode FROM hubs WHERE id = ${req.session.hubId}`;
    const member = req.member.name ? req.member : null;

    const personal = hub.shortcut_mode === 'personal' && Boolean(member);
    return {
        memberId: personal ? member.id : null,
        canEdit: personal || member?.role === 'owner',
    };
}

function readPosition(req, res) {
    const position = Number(req.params.position);
    if (!Number.isInteger(position) || position < 1 || position > 5) {
        res.status(400).json({ error: 'Position must be 1-5' });
        return null;
    }
    return position;
}

const NOT_ALLOWED = { error: 'Only the hub owner can change the shared shortcuts' };

// GET /api/shortcuts -> [{ id, position, label, url }]
router.get('/', async (req, res) => {
    const scope = await loadScope(req);
    // IS NOT DISTINCT FROM is "=" that also matches NULL with NULL
    const rows = await sql`
    SELECT id, position, label, url
    FROM shortcuts
    WHERE hub_id = ${req.session.hubId} AND member_id IS NOT DISTINCT FROM ${scope.memberId}
    ORDER BY position`;
    res.json(rows);
});

// PUT /api/shortcuts/:position  body: { label, url }
router.put('/:position', async (req, res) => {
    const position = readPosition(req, res);
    if (position === null) return;

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

    const scope = await loadScope(req);
    if (!scope.canEdit) return res.status(403).json(NOT_ALLOWED);

    const [row] = await sql`
    INSERT INTO shortcuts (hub_id, member_id, position, label, url)
    VALUES (${req.session.hubId}, ${scope.memberId}, ${position}, ${cleanLabel}, ${cleanUrl})
    ON CONFLICT (hub_id, member_id, position)
    DO UPDATE SET label = EXCLUDED.label, url = EXCLUDED.url
    RETURNING id, position, label, url`;

    res.json(row);
});

// DELETE /api/shortcuts/:position
router.delete('/:position', async (req, res) => {
    const position = readPosition(req, res);
    if (position === null) return;

    const scope = await loadScope(req);
    if (!scope.canEdit) return res.status(403).json(NOT_ALLOWED);

    await sql`
    DELETE FROM shortcuts
    WHERE hub_id = ${req.session.hubId} AND member_id IS NOT DISTINCT FROM ${scope.memberId}
        AND position = ${position}`;

    res.status(204).end();
});

export default router;
