import { fetchIcsEvents } from './lib/ics.js';

const url = 'https://calendar.google.com/calendar/ical/en.canadian%23holiday%40group.v.calendar.google.com/public/basic.ics';
const from = new Date().toISOString();
const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

const events = await fetchIcsEvents(url, from, to, 'Canada holidays');
console.log(events.length, 'events');
console.log(events.slice(0, 4));