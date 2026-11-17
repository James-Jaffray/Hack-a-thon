import { Router } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../lib/db.js';
import { requireUser, hashToken, redeemInvite, enterHub } from '../lib/auth.js';

// Accounts: one per person. Hubs and invites are in api/hub.js.
const router = Router();

// POST /api/auth/signup  body: { email, password, name } -> 201 { hubId }
// hubId is the hub they landed in (from an invite link), or null if they have none yet.
router.post('/signup', async (req, res) => {
    const { email, password, name } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
        return res.status(400).json({ error: 'Email, name and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (cleanEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (cleanName.length < 1 || cleanName.length > 40) {
        return res.status(400).json({ error: 'Name must be 1 to 40 characters' });
    }
    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be 8 to 72 characters' });
    }

    const hash = await bcrypt.hash(password, 10);

    try {
        const [user] = await sql`
            INSERT INTO users (email, password_hash, name)
            VALUES (${cleanEmail}, ${hash}, ${cleanName})
            RETURNING id`;
        req.session.userId = user.id;   // this is what "logs you in"
        await enterHub(req);
        res.status(201).json({ hubId: req.session.hubId });
    } catch (err) {
        if (err.code === '23505') {     // unique violation: email already exists
            return res.status(409).json({ error: 'An account with that email already exists' });
        }
        throw err;                      // anything else: Express 5 turns it into a 500
    }
});

// POST /api/auth/login  body: { email, password } -> { hubId }
router.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const [user] = await sql`
        SELECT id, password_hash FROM users
        WHERE email = ${email.trim().toLowerCase()}`;

    // password_hash is NULL for Google-only accounts, so they can't be logged in to this way
    const ok = user?.password_hash && await bcrypt.compare(password, user.password_hash);
    if (!ok) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    await enterHub(req);
    res.json({ hubId: req.session.hubId });
});

// GET /api/auth/me -> who you are, your hubs, and the hub you are looking at.
// hubName is null (and the hub fields are missing) until you create, join or pick a hub.
router.get('/me', requireUser, async (req, res) => {
    const [user] = await sql`SELECT id, email FROM users WHERE id = ${req.session.userId}`;
    if (!user) {                        // account was deleted but the cookie still exists
        req.session = null;
        return res.status(401).json({ error: 'Not logged in' });
    }

    const hubs = await sql`
        SELECT h.id, h.name, h.shortcut_mode, h.settings, h.is_active,
               m.id AS member_id, m.name AS member_name, m.role
        FROM members m JOIN hubs h ON h.id = m.hub_id
        WHERE m.user_id = ${user.id} AND NOT m.is_banned
        ORDER BY lower(h.name), h.id`;
    const hub = hubs.find((h) => h.id === req.session.hubId);

    res.json({
        account: user.email ?? 'Google account',
        hubs: hubs.map((h) => ({ id: h.id, name: h.name })),
        hubName: hub?.name ?? null,
        shortcutMode: hub?.shortcut_mode,
        settings: hub?.settings,
        active: hub?.is_active,
        member: hub ? { id: hub.member_id, name: hub.member_name, role: hub.role } : null,
    });
});

// GET /api/auth/invite -> { hubName } for the invite link this browser opened.
// { hubName: null } if it opened none; 404 if the link is no longer good.
// No login needed: the sign-in page uses it to say which hub you were invited to.
router.get('/invite', async (req, res) => {
    if (!req.session.inviteToken) return res.json({ hubName: null });
    const [invite] = await sql`
        SELECT h.name FROM invites i JOIN hubs h ON h.id = i.hub_id
        WHERE i.token_hash = ${hashToken(req.session.inviteToken)} AND i.expires_at > now()`;
    if (!invite) {
        req.session.inviteToken = null;
        return res.status(404).json({ error: 'This invite link has expired or was already used' });
    }
    res.json({ hubName: invite.name });
});

// POST /api/auth/invite/accept  for someone who was already signed in when they opened the link
router.post('/invite/accept', requireUser, async (req, res) => {
    if (!await redeemInvite(req)) {
        return res.status(410).json({ error: 'This invite link has expired or was already used' });
    }
    res.json({ hubId: req.session.hubId });
});

router.post('/logout', (req, res) => {
    req.session = null;
    res.json({ ok: true });
});

export default router;
