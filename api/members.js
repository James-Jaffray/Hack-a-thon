import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

// Your own profile inside the hub you are looking at.
const router = Router();
router.use(requireAuth);

// PUT /api/members/me  body: { name }  choose or change your display name in this hub
router.put('/me', async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 1 || name.length > 40) {
        return res.status(400).json({ error: 'Name must be 1 to 40 characters' });
    }
    try {
        const [member] = await sql`
            UPDATE members SET name = ${name} WHERE id = ${req.member.id}
            RETURNING id, name`;
        // owner_name is the label shown on events, so keep it equal to the display name
        await sql`UPDATE calendar_connections SET owner_name = ${name} WHERE member_id = ${member.id}`;
        res.json(member);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'That name is taken in this hub' });
        }
        throw err;
    }
});

export default router;
