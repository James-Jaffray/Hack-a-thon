import { getConnections, deleteConnection, addApple } from './api.js';
import { renderCalendarPicker } from './calendar-picker.js';

const list = document.querySelector('#connections-list');
const message = document.querySelector('#connections-message');
const appleForm = document.querySelector('#apple-form');

// The Google callback comes back as /dashboard.html?google=connected|denied|error
const googleResult = new URLSearchParams(location.search).get('google');
if (googleResult) {
    message.textContent = {
        connected: 'Google Calendar connected.',
        denied: 'Google access was denied.',
        error: 'Something went wrong connecting Google. Try again.',
    }[googleResult] ?? '';
    history.replaceState(null, '', location.pathname);   // clean the URL
}

async function loadConnections() {
    const { ok, data } = await getConnections();
    list.replaceChildren();

    if (!ok || !data) {
        list.textContent = "Couldn't load calendars.";
        return;
    }
    if (data.length === 0) {
        list.textContent = 'No calendars connected yet.';
        return;
    }

    for (const conn of data) {
        const li = document.createElement('li');

        const title = document.createElement('strong');
        title.textContent = `${conn.displayName} (${conn.provider})`;

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.addEventListener('click', async () => {
            if (!confirm(`Remove ${conn.displayName}?`)) return;
            const res = await deleteConnection(conn.id);
            if (res.ok) loadConnections();
            else message.textContent = "Couldn't remove that calendar.";
        });

        li.append(title, ' ', remove);

        // Google connections get the on/off list for their calendars
        if (conn.provider === 'google') {
            const picker = document.createElement('div');
            li.append(picker);
            renderCalendarPicker(picker, conn.id);
        }

        list.append(li);
    }
}

appleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';

    const icsUrl = document.querySelector('#apple-url').value.trim();
    const displayName = document.querySelector('#apple-name').value.trim();

    const res = await addApple(icsUrl, displayName || undefined);
    if (res.ok) {
        appleForm.reset();
        message.textContent = 'Calendar added.';
        loadConnections();
    } else {
        message.textContent = res.data?.error ?? "Couldn't add that calendar.";
    }
});

loadConnections();