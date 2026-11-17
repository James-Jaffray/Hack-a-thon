import { Router } from 'express';
import sql from '../lib/db.js';
import crypto from 'node:crypto';
import {
    requireUser, requireAuth, requireActiveHub, requireOwner, addMember, hashToken,
} from '../lib/auth.js';

// Hubs: creating one, choosing which one you look at, its members, and what only the owner may do.
const router = Router();

// POST /api/hub  body: { name } -> 201 { id, name }  create a hub; you become its owner
router.post('/', requireUser, async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 1 || name.length > 40) {
        return res.status(400).json({ error: 'Hub name must be 1 to 40 characters' });
    }
    // A transaction: a hub never exists without its owner
    const hub = await sql.begin(async (tx) => {
        const [created] = await tx`INSERT INTO hubs (name) VALUES (${name}) RETURNING id, name`;
        await addMember(tx, created.id, req.session.userId, 'owner');
        return created;
    });
    req.session.hubId = hub.id;
    res.status(201).json(hub);
});

// POST /api/hub/switch  body: { hubId }  look at another hub you belong to
router.post('/switch', requireUser, async (req, res) => {
    const hubId = Number(req.body?.hubId);
    const [member] = Number.isInteger(hubId)
        ? await sql`
            SELECT id FROM members
            WHERE hub_id = ${hubId} AND user_id = ${req.session.userId} AND NOT is_banned`
        : [];
    if (!member) return res.status(404).json({ error: 'Not found' });
    req.session.hubId = hubId;
    res.json({ ok: true });
});

// Everything below is about the hub you are looking at
router.use(requireAuth);

// POST /api/hub/invites -> 201 { token, expiresAt }  the link is /invite/<token>.
// It lets one person join, within 7 days. Only the hash is stored, so it can't be shown again.
router.post('/invites', requireActiveHub, requireOwner, async (req, res) => {
    const token = crypto.randomBytes(24).toString('base64url');
    await sql`DELETE FROM invites WHERE expires_at < now()`;    // tidy up old ones
    const [invite] = await sql`
        INSERT INTO invites (hub_id, token_hash, expires_at)
        VALUES (${req.session.hubId}, ${hashToken(token)}, now() + interval '7 days')
        RETURNING expires_at AS "expiresAt"`;
    res.status(201).json({ token, expiresAt: invite.expiresAt });
});

// Hub settings the owner can switch on or off. Add a key here to add a setting (e.g. a theme).
const SETTING_KEYS = ['isTempToggled', 'isFeelsLikeToggled', 'isConditionToggled', 'isHumidityToggled'];

// GET /api/hub/members -> [{ id, name, role, isBanned }]  everyone in the hub can see who is in it
router.get('/members', requireActiveHub, async (req, res) => {
    const rows = await sql`
        SELECT id, name, role, is_banned AS "isBanned"
        FROM members
        WHERE hub_id = ${req.session.hubId}
        ORDER BY id`;
    res.json(rows);
});

// Load the member the owner wants to act on, or send the error and return null.
// hub_id in the WHERE means an owner can only touch members of their own hub.
async function loadTarget(req, res, id) {
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Bad member id' });
        return null;
    }
    if (id === req.member.id) {
        res.status(400).json({ error: "You can't do that to yourself. Transfer ownership first." });
        return null;
    }
    const [target] = await sql`
        SELECT id, name, is_banned FROM members
        WHERE id = ${id} AND hub_id = ${req.session.hubId}`;
    if (!target) {
        res.status(404).json({ error: 'Not found' });
        return null;
    }
    return target;
}

// DELETE /api/hub/members/:id  remove a member; their calendars and personal shortcuts go with them.
// Removing a banned member lifts the ban, because the row that blocked them is gone.
router.delete('/members/:id', requireOwner, async (req, res) => {
    const target = await loadTarget(req, res, Number(req.params.id));
    if (!target) return;

    await sql`DELETE FROM members WHERE id = ${target.id}`;
    res.status(204).end();
});

// POST /api/hub/members/:id/ban  the member row stays (so an invite link can't let the same
// account back in) but they lose access to the hub, and their calendars are removed.
router.post('/members/:id/ban', requireOwner, async (req, res) => {
    const target = await loadTarget(req, res, Number(req.params.id));
    if (!target) return;

    await sql`UPDATE members SET is_banned = TRUE WHERE id = ${target.id}`;
    await sql`DELETE FROM calendar_connections WHERE member_id = ${target.id}`;
    res.json({ id: target.id, isBanned: true });
});

// POST /api/hub/transfer  body: { memberId }  hand the owner role to another member
router.post('/transfer', requireOwner, async (req, res) => {
    const target = await loadTarget(req, res, Number(req.body?.memberId));
    if (!target) return;
    if (target.is_banned || !target.name) {
        return res.status(400).json({ error: 'That member cannot be the owner' });
    }

    // A transaction: both updates happen or neither does, so a hub never ends up with 0 or 2 owners
    await sql.begin(async (tx) => {
        await tx`UPDATE members SET role = 'member' WHERE id = ${req.member.id}`;
        await tx`UPDATE members SET role = 'owner' WHERE id = ${target.id}`;
    });
    res.json({ ok: true });
});

// PUT /api/hub/settings  body: { shortcutMode?, settings?: { isTempToggled: false, ... } }
router.put('/settings', requireActiveHub, requireOwner, async (req, res) => {
    const { shortcutMode, settings } = req.body ?? {};
    if (shortcutMode !== undefined && !['shared', 'personal'].includes(shortcutMode)) {
        return res.status(400).json({ error: "shortcutMode must be 'shared' or 'personal'" });
    }

    // Keep only settings we know, and only true/false values
    const clean = {};
    for (const key of SETTING_KEYS) {
        if (typeof settings?.[key] === 'boolean') clean[key] = settings[key];
    }

    // settings || {...} merges the new keys into the stored JSON
    const [hub] = await sql`
        UPDATE hubs
        SET shortcut_mode = COALESCE(${shortcutMode ?? null}, shortcut_mode),
            settings = settings || ${sql.json(clean)}::jsonb
        WHERE id = ${req.session.hubId}
        RETURNING shortcut_mode AS "shortcutMode", settings`;
    res.json(hub);
});

// POST /api/hub/active  body: { active: true | false }  deactivate or reactivate the hub.
// Not behind requireActiveHub, or the owner could never switch it back on.
router.post('/active', requireOwner, async (req, res) => {
    const { active } = req.body ?? {};
    if (typeof active !== 'boolean') {
        return res.status(400).json({ error: 'active must be true or false' });
    }
    await sql`UPDATE hubs SET is_active = ${active} WHERE id = ${req.session.hubId}`;
    res.json({ active });
});

export default router;
