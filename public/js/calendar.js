import { getEvents } from './api.js';

let year = new Date().getFullYear();
let month = new Date().getMonth();   // 0-based

async function renderMonth() {
    // 1. Make sure the calendar body exists
    let body = document.getElementById('calendar-body');
    if (!body) {
        body = document.createElement('div');
        body.id = 'calendar-body';
        document.getElementById('calendar').append(body);
    }

    // 2. Show a loading message while we wait for the server
    body.replaceChildren();
    const loading = document.createElement('p');
    loading.textContent = 'Loading events…';
    body.append(loading);

    // 3. Ask the server for the month
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    const { ok, status, data } = await getEvents(from, to);
    if (status === 401) { window.location.href = '/login.html'; return; }

    // 4. The answer is back, so clear the loading message
    body.replaceChildren();

    if (!ok || !data) {
        const p = document.createElement('p');
        p.textContent = `Couldn't load events (status ${status}).`;
        body.append(p);
        return;
    }

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    document.getElementById('month-year').textContent =
        new Date(year, month, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

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

    function showDay(key) {
        const list = document.querySelector('#upcoming-events .event-list');
        const heading = document.querySelector('#upcoming-events h2');
        list.replaceChildren();

        // "Events Today" for today, otherwise the date itself
        const isToday = key === new Date().toLocaleDateString('en-CA');
        heading.textContent = isToday
            ? 'Events Today'
            : new Date(`${key}T00:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

        const events = byDay.get(key) ?? [];

        if (events.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'Nothing scheduled.';
            list.append(p);
        }

        for (const ev of events) {
            const row = document.createElement('div');
            row.className = 'today-event';

            const dot = document.createElement('span');
            dot.className = 'dot';
            dot.style.background = ev.color;

            const time = ev.allDay
                ? 'All day'
                : new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

            row.append(dot, `${time}  ${ev.title} · ${ev.owner}`);
            list.append(row);
        }
    }


    // Grid layout
    const firstDay = new Date(year, month, 1).getDay();           // blank cells before the 1st
    const daysInMonth = new Date(year, month + 1, 0).getDate();   // last day of this month

    const grid = document.createElement('div');
    grid.id = 'calendar-grid';

    for (let i = 0; i < firstDay; i++) {
        grid.append(document.createElement('div'));
    }

    const todayKey = new Date().toLocaleDateString('en-CA');
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${monthKey}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'day';
        if (key === todayKey) cell.classList.add('today');

        cell.addEventListener('click', () => {
            document.querySelector('.day.selected')?.classList.remove('selected');
            cell.classList.add('selected');
            showDay(key);
        });

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
            line.title = `${time}  ${ev.title} (${ev.owner})`;   // full text + who it belongs to

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

    // Pad the last week so the grid ends on a full row
    const trailing = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
        grid.append(document.createElement('div'));
    }

    body.append(grid);


        // Show today's events (or the 1st when browsing another month)
    const today = new Date();
    const isCurrent = year === today.getFullYear() && month === today.getMonth();
    showDay(isCurrent ? today.toLocaleDateString('en-CA') : `${monthKey}-01`);


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