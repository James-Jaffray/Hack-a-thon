import sql from './lib/db.js';
import { fetchGoogleEvents } from './lib/google.js';

const [c] = await sql`
  SELECT credential FROM calendar_connections
  WHERE provider = 'google' AND display_name = 'james.v.jaffray@gmail.com'`;

const from = new Date().toISOString();
const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

const events = await fetchGoogleEvents(c.credential, from, to);
console.log(`Got ${events.length} events`);
console.log(events.slice(0, 3));
await sql.end();
