<?php
// lib/db.php: returns a ready-to-use PDO connection to Postgres.
// Usage in other files:  $pdo = require __DIR__ . '/../lib/db.php';

// 1. Read .env (one folder above lib/) into an array
$envPath = __DIR__ . '/../.env';
if (!file_exists($envPath)) {
    throw new RuntimeException('.env file not found. Copy .env.example to .env first.');
}

$env = [];
foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') {
        continue; // skip blanks and comments
    }
    [$key, $value] = explode('=', $line, 2);
    $env[trim($key)] = trim($value);
}

// 2. Build the connection string
$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s',
    $env['DB_HOST'],
    $env['DB_PORT'],
    $env['DB_NAME']
);

// 3. Connect
$pdo = new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // errors throw instead of failing silently
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // rows come back as $row['email']
]);

// 4. Hand the connection to whoever required this file
return $pdo;