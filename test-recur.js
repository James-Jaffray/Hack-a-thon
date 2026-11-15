import ical from 'node-ical';

const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    'BEGIN:VEVENT',
    'UID:weekly-class@test',
    'DTSTAMP:20261101T000000Z',
    'DTSTART;TZID=America/Edmonton:20261102T090000',
    'DTEND;TZID=America/Edmonton:20261102T103000',
    'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=8',
    'EXDATE;TZID=America/Edmonton:20261116T090000',
    'SUMMARY:Weekly class',
    'END:VEVENT',
    'END:VCALENDAR',
].join('\r\n');

const data = ical.sync.parseICS(ics);
const ev = Object.values(data).find(e => e.type === 'VEVENT');

const instances = ical.expandRecurringEvent(ev, {
    from: new Date('2026-11-01'),
    to: new Date('2026-12-31'),
});

console.log(instances.length, 'instances');
console.log(instances.map(i => i.start.toISOString()));
console.log(Object.keys(instances[0]));