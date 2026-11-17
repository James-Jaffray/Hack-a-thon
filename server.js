import express from 'express';
import cookieSession from 'cookie-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './api/auth.js';
import shortcutsRoutes from './api/shortcuts.js';
import googleRoutes from './api/google.js';
import eventsRoutes from './api/events.js';
import connectionsRoutes from './api/connections.js';
import membersRoutes from './api/members.js';
import hubRoutes from './api/hub.js';
import sql from './lib/db.js';



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy',1);

// For the uptime monitor: 200 only if the server AND the database answer
app.get('/health', async (req, res) => {
    await sql`SELECT 1`;
    res.json({ ok: true });
});

app.use(express.json());
app.use(cookieSession({
    name: 'calhub',   // renamed from 'session': old cookies stored a hub id as userId and must not be read as a person
    keys: [process.env.SESSION_SECRET],
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
}));

// The cookie is only re-sent when the session changes. Changing it once a day restarts the
// 30 days, so people who keep using CalHub (e.g. as their new tab page) never get signed out.
app.use((req, res, next) => {
    if (req.session.userId) req.session.day = Math.floor(Date.now() / 86_400_000);
    next();
});

// An invite link. Remember the token, then login.html says which hub it is for.
app.get('/invite/:token', (req, res) => {
    req.session.inviteToken = req.params.token;
    res.redirect('/login.html');
});

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/hub', hubRoutes);
app.use('/api/shortcuts', shortcutsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/auth/google', googleRoutes);
app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running at http://localhost:${port}`));