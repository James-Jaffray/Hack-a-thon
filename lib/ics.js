import ical from 'node-ical';
import dns from 'node:dns/promises';
import net from 'node:net';

const APPLE_COLOR = '#ff6b6b';

// node-ical sometimes wraps text fields as { params, val }
const text = (v) => (v && typeof v === 'object' ? v.val : v);

// All-day events: read the calendar day in the event's own timezone
function dayString(date, tz) {
    return new Intl.DateTimeFormat('en-CA', {   // en-CA formats as YYYY-MM-DD
        timeZone: tz ?? 'UTC',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
}

function toEvent(inst, calendarName) {
    const ev = inst.event;
    const tz = inst.start.tz ?? ev?.start?.tz;
    const end = inst.end ?? inst.start;
    const allDay = Boolean(inst.isFullDay);

    return {
        id: `apple:${ev.uid}:${inst.start.toISOString()}`,
        title: text(inst.summary) || '(No title)',
        start: allDay ? dayString(inst.start, tz) : inst.start.toISOString(),
        end: allDay ? dayString(end, tz) : end.toISOString(),
        allDay,
        source: 'apple',
        calendarName,
        color: APPLE_COLOR,
    };
}

// from / to are ISO strings, same as fetchGoogleEvents
export async function fetchIcsEvents(url, from, to, calendarName = 'Apple Calendar') {
    const u = normalizeIcsUrl(url);
    if (!u) throw new Error('Invalid calendar URL');
    await assertPublicHost(u.hostname);

    const data = await ical.async.fromURL(u.href, { signal: AbortSignal.timeout(10_000) });
    if (!Object.values(data).some(e => e.type === 'VCALENDAR' || e.type === 'VEVENT')) {
        throw new Error('Not an ICS calendar');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const events = [];
    for (const ev of Object.values(data)) {
        if (ev.type !== 'VEVENT') continue;
        const instances = ical.expandRecurringEvent(ev, {
            from: fromDate,
            to: toDate,
            expandOngoing: true,   // include multi-day events that started before the window
        });
        for (const inst of instances) events.push(toEvent(inst, calendarName));
    }
    return events;
}

// Addresses a user-supplied URL must never point at (private networks, loopback, link-local)
const blocked = new net.BlockList();
for (const [addr, bits] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16],
]) blocked.addSubnet(addr, bits, 'ipv4');
for (const [addr, bits] of [
    ['::1', 128], ['fc00::', 7], ['fe80::', 10],
]) blocked.addSubnet(addr, bits, 'ipv6');

// webcal:// -> https://, https only, otherwise null
export function normalizeIcsUrl(raw) {
    let s = String(raw ?? '').trim();
    if (/^webcal:\/\//i.test(s)) s = 'https://' + s.slice('webcal://'.length);
    try {
        const u = new URL(s);
        return u.protocol === 'https:' ? u : null;
    } catch {
        return null;
    }
}

async function assertPublicHost(hostname) {
    // Reject IP-address hosts outright; real calendar links use hostnames
    if (net.isIP(hostname.replace(/^\[|\]$/g, ''))) throw new Error('IP addresses not allowed');
    const addrs = await dns.lookup(hostname, { all: true });
    for (const { address, family } of addrs) {
        if (blocked.check(address, family === 6 ? 'ipv6' : 'ipv4')) {
            throw new Error('Address not allowed');
        }
    }
}