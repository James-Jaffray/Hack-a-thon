import { Router } from 'express';
import crypto from 'node:crypto';
import sql from '../lib/db.js';
import { requireAuth, requireActiveHub, requireMember, enterHub } from '../lib/auth.js';

const router = Router();

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

// GET /auth/google/signin  "Sign in with Google" (no account needed yet): only asks who you are,
// no calendar access.
// It comes back to the same /callback as connecting, so Google needs just one redirect URI.
router.get('/signin', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    req.session.oauthFlow = 'signin';

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid',     // just a stable account id; we never ask for the email
        prompt: 'select_account',
        state,
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/google  connect a calendar; you must be in a hub and have a display name
router.get('/', requireAuth, requireActiveHub, requireMember, (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    req.session.oauthFlow = 'connect';

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

    const signingIn = req.session.oauthFlow === 'signin';
    if (error) return res.redirect(signingIn ? '/login.html' : '/dashboard.html?google=denied');

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
        return res.redirect(signingIn ? '/login.html' : '/dashboard.html?google=error');
    }
    const tokens = await tokenRes.json();

    if (signingIn) {
        // The id_token came straight from Google over HTTPS, so we can read it without checking its signature
        const { sub } = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url'));
        // First time: this creates their account. It has no name; each hub asks them to choose one.
        // The no-op UPDATE makes RETURNING work for an existing account too.
        const [user] = await sql`
            INSERT INTO users (google_sub) VALUES (${sub})
            ON CONFLICT (google_sub) DO UPDATE SET google_sub = EXCLUDED.google_sub
            RETURNING id`;
        req.session.userId = user.id;
        await enterHub(req);
        return res.redirect(req.session.hubId ? '/index.html' : '/hubs.html');
    }

    // From here on: connecting a calendar. requireMember ran when the flow started; re-check who it is.
    const [member] = await sql`
        SELECT id, name FROM members
        WHERE user_id = ${req.session.userId ?? null} AND hub_id = ${req.session.hubId ?? null}
            AND name IS NOT NULL AND NOT is_banned`;
    if (!member) return res.redirect('/dashboard.html?google=error');

    if (!tokens.refresh_token) {
        return res.redirect('/dashboard.html?google=error');
    }

    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!calRes.ok) return res.redirect('/dashboard.html?google=error');
    const displayName = (await calRes.json()).id;

    // The label everyone sees on this calendar's events is the member's display name
    const owner = member.name;

    const hubId = req.session.hubId;
    const [existing] = await sql`
        SELECT id FROM calendar_connections
        WHERE hub_id = ${hubId} AND provider = 'google' AND display_name = ${displayName}`;

    if (existing) {
        await sql`
            UPDATE calendar_connections
            SET credential = ${tokens.refresh_token}, owner_name = ${owner},
                member_id = ${member.id}   -- signing in to the Google account proves it's theirs
            WHERE id = ${existing.id}`;
    } else {
        await sql`
            INSERT INTO calendar_connections
                (hub_id, member_id, provider, credential, display_name, owner_name, enabled_calendars)
            VALUES (${hubId}, ${member.id}, 'google', ${tokens.refresh_token}, ${displayName}, ${owner},
                ${sql.json([])})`;     // [] = share nothing until the owner ticks calendars
    }

    res.redirect('/dashboard.html?google=connected');
});

export default router;