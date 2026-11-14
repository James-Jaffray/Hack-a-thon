import sql from './lib/db.js';

console.log(await sql`SELECT count(*) FROM users`);
await sql.end();