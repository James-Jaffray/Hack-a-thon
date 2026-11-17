-- Brings an existing database up to date with db/schema.sql without losing data.
-- Safe to run more than once: everything is skipped once the `hubs` table exists.
-- It runs as one transaction, so if any step fails nothing is changed.
-- docker compose exec -T db psql -U postgres -d calhub < db/migrate.sql
--
-- What happens to the old logins (hubs used to have a shared name + password):
--   * A member who signed in with Google: nothing changes, "Sign in with Google" still works.
--   * A member with a name + password: their login becomes  name@hubname  (lower case), same password.
--   * A hub with no owner yet: the old hub name + hub password becomes the owner's account.
-- The shared hub password is then gone. New people join with an invite link from the owner.

DO $$
BEGIN
IF to_regclass('public.hubs') IS NOT NULL THEN
    RAISE NOTICE 'Already migrated, nothing to do.';
    RETURN;
END IF;

-- ---- Older steps (databases from before members existed) ----
ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS owner_name TEXT;

CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    google_sub TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hub_id, google_sub)
);
ALTER TABLE members ALTER COLUMN name DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_hub_name ON members (hub_id, lower(name));

-- NULL = connected before members existed; nobody can edit it until its owner reconnects.
ALTER TABLE calendar_connections
    ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member'));
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_owner_per_hub ON members (hub_id) WHERE role = 'owner';

-- Hubs that already have members but no owner: the oldest member becomes the owner
UPDATE members m SET role = 'owner'
WHERE m.id = (SELECT min(id) FROM members WHERE hub_id = m.hub_id AND NOT is_banned AND name IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM members WHERE hub_id = m.hub_id AND role = 'owner');

ALTER TABLE users ADD COLUMN IF NOT EXISTS shortcut_mode TEXT NOT NULL DEFAULT 'shared'
    CHECK (shortcut_mode IN ('shared', 'personal'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Shortcuts: member_id NULL = the hub's shared set, otherwise that member's personal set
ALTER TABLE shortcuts ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE shortcuts DROP CONSTRAINT IF EXISTS shortcuts_user_id_position_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shortcuts_slot
    ON shortcuts (user_id, member_id, position) NULLS NOT DISTINCT;

-- ---- Accounts and invites: the old `users` table was really the hubs ----
ALTER TABLE users RENAME TO hubs;
ALTER TABLE hubs RENAME COLUMN email TO name;
ALTER TABLE hubs DROP CONSTRAINT IF EXISTS users_email_key;     -- hub names no longer need to be unique
-- Free the old names for the new `users` table below
ALTER INDEX users_pkey RENAME TO hubs_pkey;
ALTER SEQUENCE users_id_seq RENAME TO hubs_id_seq;
ALTER TABLE calendar_connections RENAME COLUMN user_id TO hub_id;
ALTER TABLE shortcuts RENAME COLUMN user_id TO hub_id;
ALTER INDEX IF EXISTS idx_connections_user_id RENAME TO idx_connections_hub_id;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    google_sub TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (email IS NOT NULL OR google_sub IS NOT NULL)
);
ALTER TABLE members ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Google members: one account per Google id, even if it is in several hubs
INSERT INTO users (google_sub)
    SELECT DISTINCT google_sub FROM members WHERE google_sub IS NOT NULL;
UPDATE members m SET user_id = u.id FROM users u WHERE u.google_sub = m.google_sub;

-- Password members had no email, so their login becomes name@hubname
INSERT INTO users (email, password_hash, name)
    SELECT lower(m.name || '@' || h.name), m.password_hash, m.name
    FROM members m JOIN hubs h ON h.id = m.hub_id
    WHERE m.user_id IS NULL AND m.password_hash IS NOT NULL AND m.name IS NOT NULL;
UPDATE members m SET user_id = u.id
    FROM users u, hubs h
    WHERE h.id = m.hub_id AND m.user_id IS NULL AND u.email = lower(m.name || '@' || h.name);

-- Hubs nobody owns yet: the old hub login becomes the owner's account
INSERT INTO users (email, password_hash)
    SELECT h.name, h.password_hash FROM hubs h
    WHERE NOT EXISTS (SELECT 1 FROM members WHERE hub_id = h.id AND role = 'owner');
INSERT INTO members (hub_id, user_id, role)
    SELECT h.id, u.id, 'owner' FROM hubs h JOIN users u ON u.email = h.name
    WHERE NOT EXISTS (SELECT 1 FROM members WHERE hub_id = h.id AND role = 'owner');

DELETE FROM members WHERE user_id IS NULL;      -- no way to sign in; there should be none
ALTER TABLE members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE members ADD UNIQUE (hub_id, user_id);
ALTER TABLE members DROP COLUMN google_sub, DROP COLUMN password_hash;
ALTER TABLE hubs DROP COLUMN password_hash;

CREATE TABLE invites (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL
);
END $$;
