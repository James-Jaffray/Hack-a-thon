import { Router } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../lib/db.js';

const router = Router();

// routes go here




router.post('/signup', async (req, res) => {
    const { email, password } = req.body ?? {};

    // Validate
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Hub name and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();   // "email" column holds the hub name
    if (cleanEmail.length < 3 || cleanEmail.length > 40) {
        return res.status(400).json({ error: 'Hub name must be 3 to 40 characters' });
    }
    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be 8 to 72 characters' });
    }

    const hash = await bcrypt.hash(password, 10);

    try {
        const [user] = await sql`
            INSERT INTO users (email, password_hash)
            VALUES (${cleanEmail}, ${hash})
            RETURNING id, email`;
        req.session.userId = user.id;   // this is what "logs you in"
        res.status(201).json(user);
    } catch (err) {
        if (err.code === '23505') {     // unique violation: email already exists
            return res.status(409).json({ error: 'That hub name is taken' });
        }
        throw err;                      // anything else: Express 5 turns it into a 500
    }
})

router.get('/me', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    const [user] = await sql`SELECT id, email FROM users WHERE id = ${req.session.userId}`;
    if (!user) {                        // user was deleted but cookie still exists
        req.session = null;
        return res.status(401).json({ error: 'Not logged in' });
    }
    res.json(user);
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Hub name and password are required' });
    }

    const [user] = await sql`
        SELECT id, email, password_hash FROM users
        WHERE email = ${email.trim().toLowerCase()}`;

    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) {
        return res.status(401).json({ error: 'Invalid hub name or password' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email });
});

router.post('/logout', (req, res) => {
    req.session = null;
    res.json({ ok: true });
});






export default router;