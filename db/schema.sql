DROP TABLE IF EXISTS shortcuts;
DROP TABLE IF EXISTS calendar_connections;
DROP TABLE IF EXISTS invites;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS hubs;
DROP TABLE IF EXISTS users;

-- Any change in this file also goes in db/migrate.sql.

-- A person. They sign in with email + password, or with Google.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE,          -- NULL for Google-only accounts (we never ask Google for it)
    password_hash TEXT,
    google_sub TEXT UNIQUE,     -- Google's permanent id for the account
    name TEXT,                  -- the display name they start with in a hub they join
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (email IS NOT NULL OR google_sub IS NOT NULL)
);

CREATE TABLE hubs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    shortcut_mode TEXT NOT NULL DEFAULT 'shared' CHECK (shortcut_mode IN ('shared', 'personal')),
    settings JSONB NOT NULL DEFAULT '{}',       -- hub-wide display settings, changed by the owner
    is_active BOOLEAN NOT NULL DEFAULT TRUE,    -- FALSE = deactivated by the owner
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A person's place in a hub. One person can be in several hubs.
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,                  -- display name in this hub; NULL until they choose one
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,   -- the row stays, so an invite can't let them back in
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hub_id, user_id)
);
CREATE UNIQUE INDEX idx_members_hub_name ON members (hub_id, lower(name));
CREATE UNIQUE INDEX idx_one_owner_per_hub ON members (hub_id) WHERE role = 'owner';

-- An invite link made by the hub owner. It works once: the row is deleted when it is used.
CREATE TABLE invites (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,    -- SHA-256 of the token in the link; the token itself is never stored
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE calendar_connections (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,   -- who may manage it; NULL = legacy
    provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
    credential TEXT NOT NULL,
    display_name TEXT,
    enabled_calendars JSONB,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    owner_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hub_id, provider, credential)
);

CREATE TABLE shortcuts (
    id         SERIAL PRIMARY KEY,
    hub_id     INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    member_id  INTEGER REFERENCES members(id) ON DELETE CASCADE,   -- NULL = the hub's shared set
    position   SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 5),
    label      TEXT NOT NULL,
    url        TEXT NOT NULL CHECK (url ~* '^https?://'),
    image_url  TEXT CHECK (image_url ~* '^https?://'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (hub_id, member_id, position)
);

CREATE INDEX idx_connections_hub_id ON calendar_connections(hub_id);
