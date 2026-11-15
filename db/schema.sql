DROP TABLE IF EXISTS shortcuts;
DROP TABLE IF EXISTS calendar_connections;
DROP TABLE IF EXISTS users;



CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE calendar_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
    credential TEXT NOT NULL,
    display_name TEXT,
    enabled_calendars JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider, credential)
);

CREATE TABLE shortcuts (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position   SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 5),
    label      TEXT NOT NULL,
    url        TEXT NOT NULL CHECK (url ~* '^https?://'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, position)
);

CREATE INDEX idx_connections_user_id ON calendar_connections(user_id);