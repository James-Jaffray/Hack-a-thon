-- Wipe existing data so the seed is re-runnable
TRUNCATE calendar_connections, users RESTART IDENTITY CASCADE;

INSERT INTO users (email, password_hash) VALUES
    ('demo@calhub.test', 'PASTE_REAL_HASH_HERE');

INSERT INTO calendar_connections (user_id, provider, credential, display_name) VALUES
    (1, 'google', 'fake-google-refresh-token', 'Demo Google Calendar'),
    (1, 'apple',  'https://example.com/demo-calendar.ics', 'Demo Apple Calendar');


    INSERT INTO shortcuts (user_id, position, label, url) VALUES
    (1, 1, 'Canvas', 'https://example.com/canvas'),
    (1, 2, 'Gmail',  'https://mail.google.com');