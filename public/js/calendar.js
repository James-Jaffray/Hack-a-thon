import { getEvents } from './api.js';

let year = new Date().getFullYear();
let month = new Date().getMonth();   // 0-based

async function renderMonth() {
    const from = new Date(year, month, 1).toISOString();
    const to   = new Date(year, month + 1, 1).toISOString();
    const { status, data } = await getEvents(from, to);
    if (status === 401) { window.location.href = '/login.html'; return; }

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    document.getElementById('month-year').textContent =
        new Date(year, month, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

    let body = document.getElementById('calendar-body');
    if (!body) {
        body = document.createElement('div');
        body.id = 'calendar-body';
        document.getElementById('calendar').append(body);
    }
    body.replaceChildren();

    function dayKey(ev) {
        return ev.allDay ? ev.start : new Date(ev.start).toLocaleDateString('en-CA');
    }

    const byDay = new Map();
    for (const ev of data.events) {
        const key = dayKey(ev);
        if (!key.startsWith(monthKey)) continue;
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(ev);
    }

    // Grid layout
    const firstDay = new Date(year, month, 1).getDay();           // blank cells before the 1st
    const daysInMonth = new Date(year, month + 1, 0).getDate();   // last day of this month

    const grid = document.createElement('div');
    grid.id = 'calendar-grid';

    for (let i = 0; i < firstDay; i++) {
        grid.append(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${monthKey}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'day';

        const num = document.createElement('div');
        num.className = 'day-num';
        num.textContent = d;
        cell.append(num);

        const events = byDay.get(key) ?? [];

        for (const ev of events.slice(0, 3)) {
            const line = document.createElement('div');
            line.className = 'day-event';

            const time = ev.allDay
                ? 'All day'
                : new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            line.title = `${time}  ${ev.title}`;   // full text on hover

            const dot = document.createElement('span');
            dot.className = 'dot';
            dot.style.background = ev.color;

            line.append(dot, ev.title);
            cell.append(line);
        }

        if (events.length > 3) {
            const more = document.createElement('div');
            more.className = 'day-more';
            more.textContent = `+${events.length - 3} more`;
            cell.append(more);
        }

        grid.append(cell);
    }

    body.append(grid);

    // Notices for connections that failed
    for (const err of data.errors) {
        const p = document.createElement('p');
        p.textContent = `${err.displayName} needs attention. `;
        if (err.needsReconnect) {
            const a = document.createElement('a');
            a.href = '/auth/google';
            a.textContent = 'Reconnect Google';
            p.append(a);
        }
        body.append(p);
    }
}

document.getElementById('previous-month').addEventListener('click', () => {
    month--;
    if (month < 0) { month = 11; year--; }
    renderMonth();
});

document.getElementById('next-month').addEventListener('click', () => {
    month++;
    if (month > 11) { month = 0; year++; }
    renderMonth();
});

renderMonth();