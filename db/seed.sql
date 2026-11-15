-- Wipe existing data so the seed is re-runnable
TRUNCATE shortcuts, calendar_connections, users RESTART IDENTITY CASCADE;

INSERT INTO users (email, password_hash) VALUES
    ('demo@calhub.test', '$2y$12$Jo1kuXYhGt8AkFWmsLrF..C3xMfrZ/lASQC02N.sdnMzMYY4uIKBm');

INSERT INTO shortcuts (user_id, position, label, url) VALUES
    (1, 1, 'Canvas', 'https://example.com/canvas'),
    (1, 2, 'Gmail',  'https://mail.google.com');