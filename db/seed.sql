-- Wipe existing data so the seed is re-runnable
TRUNCATE shortcuts, calendar_connections, invites, members, hubs, users RESTART IDENTITY CASCADE;

-- The demo account (demo@calhub.test / demo1234) owns the demo hub
INSERT INTO users (email, password_hash, name) VALUES
    ('demo@calhub.test', '$2y$12$Jo1kuXYhGt8AkFWmsLrF..C3xMfrZ/lASQC02N.sdnMzMYY4uIKBm', 'Demo');
INSERT INTO hubs (name) VALUES ('Demo hub');
INSERT INTO members (hub_id, user_id, name, role) VALUES (1, 1, 'Demo', 'owner');

INSERT INTO shortcuts (hub_id, position, label, url) VALUES
    (1, 1, 'Canvas', 'https://example.com/canvas'),
    (1, 2, 'Gmail',  'https://mail.google.com');
