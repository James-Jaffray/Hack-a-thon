import { Router } from 'express';
import crypto from 'node:crypto';
import sql from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();
router.use(requireAuth);

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

// GET /auth/google?owner=Althea
router.get('/', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;

    // Who is this calendar for? Remember it until Google sends the user back.
    const owner = String(req.query.owner ?? '').trim().slice(0, 40);
    req.session.pendingOwner = owner || null;

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        state,
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) return res.redirect('/dashboard.html?google=denied');

    if (!state || state !== req.session.oauthState) {
        return res.status(400).send('Invalid state');
    }
    req.session.oauthState = null;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
    });
    if (!tokenRes.ok) {
        console.error('Token exchange failed:', await tokenRes.text());
        return res.redirect('/dashboard.html?google=error');
    }
    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) {
        return res.redirect('/dashboard.html?google=error');
    }

    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!calRes.ok) return res.redirect('/dashboard.html?google=error');
    const displayName = (await calRes.json()).id;

    // Owner label: what they typed, or fall back to the Google email
    const owner = req.session.pendingOwner || displayName;
    req.session.pendingOwner = null;

    const userId = req.session.userId;
    const [existing] = await sql`
        SELECT id FROM calendar_connections
        WHERE user_id = ${userId} AND provider = 'google' AND display_name = ${displayName}`;

    if (existing) {
        await sql`
            UPDATE calendar_connections
            SET credential = ${tokens.refresh_token}, owner_name = ${owner}
            WHERE id = ${existing.id}`;
    } else {
        await sql`
            INSERT INTO calendar_connections (user_id, provider, credential, display_name, owner_name)
            VALUES (${userId}, 'google', ${tokens.refresh_token}, ${displayName}, ${owner})`;
    }

    res.redirect('/dashboard.html?google=connected');
});

export default router;