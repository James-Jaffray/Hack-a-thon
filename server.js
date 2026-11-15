import express from 'express';
import cookieSession from 'cookie-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './api/auth.js';
import shortcutsRoutes from './api/shortcuts.js';
import googleRoutes from './api/google.js';
import eventsRoutes from './api/events.js';



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy',1);

app.use(express.json());
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
}));

// routes go here, e.g. app.use('/api/auth', authRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/shortcuts', shortcutsRoutes);
app.use('/auth/google', googleRoutes);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/events', eventsRoutes)

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running at http://localhost:${port}`));