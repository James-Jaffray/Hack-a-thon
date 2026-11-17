import crypto from 'node:crypto';
import sql from './db.js';

// The session holds: userId (who you are), hubId (the hub you are looking at),
// and inviteToken (an invite link you opened but have not used yet).

// Signed in as a person. They may not be inside a hub yet.
export function requireUser(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    next();
}

// Signed in AND a member of the hub they are looking at. Sets req.member = { id, name, role }.
// Checked on every request, so a removed or banned member loses access at once.
export async function requireAuth(req, res, next) {
    const { userId, hubId } = req.session;
    if (!userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    const [member] = hubId
        ? await sql`
            SELECT id, name, role FROM members
            WHERE user_id = ${userId} AND hub_id = ${hubId} AND NOT is_banned`
        : [];
    if (!member) {
        return res.status(403).json({ error: 'You are not in a hub', noHub: true });
    }
    req.member = member;
    next();
}

// The hub has not been deactivated by its owner. Use after requireAuth.
export async function requireActiveHub(req, res, next) {
    const [hub] = await sql`SELECT is_active FROM hubs WHERE id = ${req.session.hubId}`;
    if (!hub?.is_active) {
        return res.status(403).json({ error: 'This hub is deactivated', deactivated: true });
    }
    next();
}

// A member who has chosen a display name. Use after requireAuth.
export function requireMember(req, res, next) {
    if (!req.member.name) {
        return res.status(403).json({ error: 'Choose a display name first' });
    }
    next();
}

// A member whose role is 'owner'. Express runs an array of middleware in order.
export const requireOwner = [requireMember, (req, res, next) => {
    if (req.member.role !== 'owner') {
        return res.status(403).json({ error: 'Only the hub owner can do that' });
    }
    next();
}];

// Invite tokens are stored hashed, so a leaked database can't be used to join hubs
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Add a person to a hub. They start with their account name, unless someone in the hub
// already uses it: then name is NULL and the dashboard asks them to choose one.
export const addMember = (tx, hubId, userId, role) => tx`
    INSERT INTO members (hub_id, user_id, role, name)
    SELECT ${hubId}, u.id, ${role},
        CASE WHEN EXISTS (SELECT 1 FROM members WHERE hub_id = ${hubId} AND lower(name) = lower(u.name))
             THEN NULL ELSE u.name END
    FROM users u WHERE u.id = ${userId}`;

// Use the invite link waiting in the session, if there is one.
// Returns true if the signed-in user is now in that hub.
export async function redeemInvite(req) {
    const { userId, inviteToken } = req.session;
    req.session.inviteToken = null;
    if (!inviteToken) return false;

    const hubId = await sql.begin(async (tx) => {
        // FOR UPDATE: if two people use the same link at once, the second one waits and then finds it gone
        const [invite] = await tx`
            SELECT id, hub_id FROM invites
            WHERE token_hash = ${hashToken(inviteToken)} AND expires_at > now()
            FOR UPDATE`;
        if (!invite) return null;

        const [existing] = await tx`
            SELECT is_banned FROM members WHERE hub_id = ${invite.hub_id} AND user_id = ${userId}`;
        // Already a member: let them in and leave the invite for someone else. Banned: stay out.
        if (existing) return existing.is_banned ? null : invite.hub_id;

        await tx`DELETE FROM invites WHERE id = ${invite.id}`;
        await addMember(tx, invite.hub_id, userId, 'member');
        return invite.hub_id;
    });

    if (hubId) req.session.hubId = hubId;
    return Boolean(hubId);
}

// Run after every sign-in: use a waiting invite, or walk straight in if they have exactly one hub.
// With no hub or several, hubId stays empty and the browser shows the hub list.
export async function enterHub(req) {
    if (await redeemInvite(req)) return;
    const hubs = await sql`
        SELECT hub_id FROM members WHERE user_id = ${req.session.userId} AND NOT is_banned`;
    req.session.hubId = hubs.length === 1 ? hubs[0].hub_id : null;
}
