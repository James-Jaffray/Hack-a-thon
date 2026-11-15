import { Router } from 'express';
import crypto from 'node:crypto';
import sql from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';


const router = Router();

router.use(requireAuth);

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

router.get('/', (req, res) => {
    // Random value we remember, so we can prove the callback is the one we started
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',   // gives us a refresh token
        prompt: 'consent',        // re-issues the refresh token on every connect
        state,
    });





    router.get('/callback', async (req, res) => {
        const { code, state, error } = req.query;

        // User clicked Cancel on Google's screen
        if (error) return res.redirect('/dashboard.html?google=denied');

        // CSRF check: must match what we stored in Part 1
        if (!state || state !== req.session.oauthState) {
            return res.status(400).send('Invalid state');
        }
        req.session.oauthState = null;

        // 1. Swap the one-time code for tokens (form-encoded body, not JSON)
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

        // 2. Ask Google whose calendar this is (the primary calendar's id is the email)
        const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (!calRes.ok) return res.redirect('/dashboard.html?google=error');
        const displayName = (await calRes.json()).id;

        // 3. Save it. Update if this Google account is already connected, otherwise insert.
        const userId = req.session.userId;
        const [existing] = await sql`
    SELECT id FROM calendar_connections
    WHERE user_id = ${userId} AND provider = 'google' AND display_name = ${displayName}`;

        if (existing) {
            await sql`UPDATE calendar_connections SET credential = ${tokens.refresh_token} WHERE id = ${existing.id}`;
        } else {
            await sql`
      INSERT INTO calendar_connections (user_id, provider, credential, display_name)
      VALUES (${userId}, 'google', ${tokens.refresh_token}, ${displayName})`;
        }

        res.redirect('/dashboard.html?google=connected');
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});







export default router;